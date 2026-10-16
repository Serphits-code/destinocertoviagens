import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function getDumpPath(): string {
  if (process.argv[2] && fs.existsSync(process.argv[2])) {
    return process.argv[2];
  }
  const dataDir = 'c:/geo/data';
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir)
      .filter((f) => f.startsWith('database_') && f.endsWith('.dump'))
      .sort()
      .reverse();
    if (files.length > 0) {
      return path.join(dataDir, files[0]).replace(/\\/g, '/');
    }
  }
  return 'c:/geo/data/database_20261016143511.dump';
}

const dumpPath = getDumpPath();
const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';

function cleanVal(str: string | undefined): string | null {
  if (!str || str === '\\N') return null;
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(str: string | null): Date | null {
  if (!str || str === '\\N') return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  console.log('✈️ Iniciando importação de Viagens (Vendas/Passageiros) do dump...');
  console.log('📁 Arquivo de dump utilizado:', dumpPath);

  // 1. Mapear Clientes cadastrados por mondeId
  console.log('🔍 Mapeando Clientes cadastrados...');
  const customers = await prisma.customer.findMany({
    select: { id: true, mondeId: true, name: true },
  });
  const custMap = new Map<string, { id: string; name: string }>();
  for (const c of customers) {
    if (c.mondeId) custMap.set(c.mondeId, { id: c.id, name: c.name });
  }
  console.log(`   - ${custMap.size} Clientes mapeados`);

  // 2. Extrair Produtos / Pacotes (Operação Própria)
  console.log('📦 Extraindo produtos do dump...');
  const prodRaw = execSync(`"${pgRestore}" -a -t produtos -f - "${dumpPath}"`, {
    maxBuffer: 40 * 1024 * 1024,
    encoding: 'utf8',
  });
  const produtosMap = new Map<string, string>();
  for (const l of prodRaw.split('\n')) {
    if (l.startsWith('\\.') || l.startsWith('--') || !l.trim() || l.startsWith('COPY') || l.startsWith('SET') || l.startsWith('SELECT')) continue;
    const parts = l.split('\t');
    if (parts.length >= 2) {
      produtosMap.set(parts[0], parts[1].trim());
    }
  }

  // 3. Obter vendas já registradas no banco
  const existingSaleNumbers = new Set(
    (await prisma.customerTrip.findMany({ select: { saleNumber: true } }))
      .map((t) => t.saleNumber)
      .filter(Boolean) as string[]
  );
  console.log(`   - ${existingSaleNumbers.size} Números de vendas já existem no histórico`);

  // 4. Extrair vendas do dump
  console.log('📑 Extraindo vendas do dump...');
  const vendasRaw = execSync(`"${pgRestore}" -a -t vendas -f - "${dumpPath}"`, {
    maxBuffer: 60 * 1024 * 1024,
    encoding: 'utf8',
  });
  const vLines = vendasRaw.split('\n');
  const vCopy = vLines.find((l) => l.startsWith('COPY destinocertoroteiros.vendas '))!;
  const vCols = vCopy.match(/\((.*)\)/)![1].split(', ').map((c) => c.trim());
  const vIdx: Record<string, number> = {};
  vCols.forEach((c, i) => (vIdx[c] = i));

  const newVendasMap = new Map<string, any>();
  for (const l of vLines) {
    if (l.startsWith('\\.') || l.startsWith('--') || !l.trim() || l.startsWith('COPY') || l.startsWith('SET') || l.startsWith('SELECT')) continue;
    const parts = l.split('\t');
    const vId = cleanVal(parts[vIdx['id']]);
    const num = cleanVal(parts[vIdx['numero']]);
    if (vId && num && !existingSaleNumbers.has(num)) {
      newVendasMap.set(vId, {
        id: vId,
        numero: num,
        paganteId: cleanVal(parts[vIdx['pagante_id']]),
        embarque: parseDate(cleanVal(parts[vIdx['data_embarque']])),
        retorno: parseDate(cleanVal(parts[vIdx['data_retorno']])),
        operacaoPropriaId: cleanVal(parts[vIdx['operacao_propria_id']]),
      });
    }
  }

  console.log(`   - ${newVendasMap.size} Novas vendas identificadas para inclusão`);

  if (newVendasMap.size === 0) {
    console.log('ℹ️ Nenhuma nova viagem para importar.');
    const totalT = await prisma.customerTrip.count();
    console.log(`🎉 Total de viagens no banco: ${totalT}`);
    return;
  }

  // 5. Extrair vendas_produtos
  console.log('🏷️ Extraindo vendas_produtos...');
  const vpRaw = execSync(`"${pgRestore}" -a -t vendas_produtos -f - "${dumpPath}"`, {
    maxBuffer: 60 * 1024 * 1024,
    encoding: 'utf8',
  });
  const vpLines = vpRaw.split('\n');
  const vpCopy = vpLines.find((l) => l.startsWith('COPY destinocertoroteiros.vendas_produtos '))!;
  const vpCols = vpCopy.match(/\((.*)\)/)![1].split(', ').map((c) => c.trim());
  const vpIdx: Record<string, number> = {};
  vpCols.forEach((c, i) => (vpIdx[c] = i));

  const vpToVenda = new Map<string, string>();
  for (const l of vpLines) {
    if (l.startsWith('\\.') || l.startsWith('--') || !l.trim() || l.startsWith('COPY') || l.startsWith('SET') || l.startsWith('SELECT')) continue;
    const parts = l.split('\t');
    const vpId = cleanVal(parts[vpIdx['vendas_produtos_id']]);
    const vId = cleanVal(parts[vpIdx['vendas_id']]);
    if (vpId && vId && newVendasMap.has(vId)) {
      vpToVenda.set(vpId, vId);
    }
  }

  // 6. Extrair vendas_produtos_passageiros
  console.log('👥 Extraindo vendas_produtos_passageiros...');
  const vppRaw = execSync(`"${pgRestore}" -a -t vendas_produtos_passageiros -f - "${dumpPath}"`, {
    maxBuffer: 60 * 1024 * 1024,
    encoding: 'utf8',
  });
  const vppLines = vppRaw.split('\n');
  const vppCopy = vppLines.find((l) => l.startsWith('COPY destinocertoroteiros.vendas_produtos_passageiros '))!;
  const vppCols = vppCopy.match(/\((.*)\)/)![1].split(', ').map((c) => c.trim());
  const vppIdx: Record<string, number> = {};
  vppCols.forEach((c, i) => (vppIdx[c] = i));

  const vendaPassengers = new Map<string, Set<string>>();
  for (const l of vppLines) {
    if (l.startsWith('\\.') || l.startsWith('--') || !l.trim() || l.startsWith('COPY') || l.startsWith('SET') || l.startsWith('SELECT')) continue;
    const parts = l.split('\t');
    const vpId = cleanVal(parts[vppIdx['vendas_produtos_id']]);
    const pId = cleanVal(parts[vppIdx['pessoa_id']]);
    if (vpId && pId && vpToVenda.has(vpId)) {
      const vId = vpToVenda.get(vpId)!;
      if (!vendaPassengers.has(vId)) vendaPassengers.set(vId, new Set());
      vendaPassengers.get(vId)!.add(pId);
    }
  }

  // 7. Construir os registros de CustomerTrip
  const tripsToInsert: any[] = [];

  for (const [vId, v] of newVendasMap.entries()) {
    const passPessoaIds = Array.from(vendaPassengers.get(vId) || []);
    const isGroupTrip = !!v.operacaoPropriaId;
    const groupName = v.operacaoPropriaId
      ? produtosMap.get(v.operacaoPropriaId) || 'Operação Própria'
      : (v.embarque ? `Viagem ${v.embarque.toISOString().slice(0, 10)}` : `Viagem Venda ${v.numero}`);

    const participants: Array<{ customerId: string; name: string; isPagante: boolean; isPassageiro: boolean }> = [];
    const addedCustIds = new Set<string>();

    for (const pId of passPessoaIds) {
      const c = custMap.get(pId);
      if (c && !addedCustIds.has(c.id)) {
        addedCustIds.add(c.id);
        participants.push({
          customerId: c.id,
          name: c.name,
          isPagante: pId === v.paganteId,
          isPassageiro: true,
        });
      }
    }

    if (v.paganteId) {
      const c = custMap.get(v.paganteId);
      if (c && !addedCustIds.has(c.id)) {
        addedCustIds.add(c.id);
        participants.push({
          customerId: c.id,
          name: c.name,
          isPagante: true,
          isPassageiro: false,
        });
      }
    }

    for (const part of participants) {
      const role = part.isPagante && part.isPassageiro
        ? 'PAGANTE_E_PASSAGEIRO'
        : part.isPagante
          ? 'PAGANTE'
          : 'PASSAGEIRO';

      const companions = participants
        .filter((p) => p.customerId !== part.customerId)
        .map((p) => ({ customerId: p.customerId, name: p.name }));

      tripsToInsert.push({
        customerId: part.customerId,
        groupName,
        destination: null,
        departureDate: v.embarque,
        returnDate: v.retorno,
        saleNumber: v.numero,
        role,
        isGroupTrip,
        companionsJson: companions,
      });
    }
  }

  console.log(`💾 Inserindo ${tripsToInsert.length} novas viagens no PostgreSQL...`);
  const batchSize = 500;
  for (let i = 0; i < tripsToInsert.length; i += batchSize) {
    const chunk = tripsToInsert.slice(i, i + batchSize);
    await prisma.customerTrip.createMany({
      data: chunk,
    });
    process.stdout.write(`   Inseridas ${Math.min(i + batchSize, tripsToInsert.length)} de ${tripsToInsert.length} viagens\r`);
  }

  const totalTrips = await prisma.customerTrip.count();
  console.log(`\n✅ Viagens inseridas com sucesso! Total no banco: ${totalTrips}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na importação de viagens:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
