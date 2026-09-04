import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dumpPath = 'c:/geo/data/database_20260902155615.dump';
const pgRestore = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';

function extractTableData(tableName: string): string {
  return execSync(`"${pgRestore}" -a -t ${tableName} -f - "${dumpPath}"`, {
    maxBuffer: 60 * 1024 * 1024,
    encoding: 'utf8',
  });
}

function parseDate(str: string | null): Date | null {
  if (!str || str === '\\N') return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function cleanVal(str: string | undefined): string | null {
  if (!str || str === '\\N') return null;
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function main() {
  console.log('🚀 Iniciando extração do dump do Monde...');

  // 1. Estados
  console.log('📍 Extraindo estados...');
  const estadosRaw = extractTableData('estado');
  const estados = new Map<string, string>();
  for (const line of estadosRaw.split('\n')) {
    if (!line.trim() || line.startsWith('\\.') || line.startsWith('--') || line.startsWith('SET') || line.startsWith('SELECT')) continue;
    const parts = line.split('\t');
    if (parts.length >= 4) {
      estados.set(parts[0], parts[2].trim()); // sigla (ex: PE, SP)
    }
  }

  // 2. Cidades
  console.log('🏙️ Extraindo cidades...');
  const cidadesRaw = extractTableData('cidade');
  const cidades = new Map<string, { nome: string; uf: string }>();
  for (const line of cidadesRaw.split('\n')) {
    if (!line.trim() || line.startsWith('\\.') || line.startsWith('--') || line.startsWith('SET') || line.startsWith('SELECT')) continue;
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const estadoUf = estados.get(parts[2]) || '';
      cidades.set(parts[0], { nome: parts[1].trim(), uf: estadoUf });
    }
  }

  // 3. Marcadores / Tags
  console.log('🏷️ Extraindo marcadores...');
  const marcadorRaw = extractTableData('marcador');
  const marcadores = new Map<string, string>();
  for (const line of marcadorRaw.split('\n')) {
    if (!line.trim() || line.startsWith('\\.') || line.startsWith('--') || line.startsWith('SET') || line.startsWith('SELECT')) continue;
    const parts = line.split('\t');
    if (parts.length >= 2) {
      marcadores.set(parts[0], parts[1].trim());
    }
  }

  const pessoaMarcadorRaw = extractTableData('pessoa_por_marcador');
  const pessoaMarcadores = new Map<string, string[]>();
  for (const line of pessoaMarcadorRaw.split('\n')) {
    if (!line.trim() || line.startsWith('\\.') || line.startsWith('--') || line.startsWith('SET') || line.startsWith('SELECT')) continue;
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const pId = parts[1].trim();
      const mId = parts[0].trim();
      const mName = marcadores.get(mId);
      if (mName) {
        if (!pessoaMarcadores.has(pId)) pessoaMarcadores.set(pId, []);
        pessoaMarcadores.get(pId)!.push(mName);
      }
    }
  }

  // 4. Pessoas
  console.log('👥 Extraindo tabela pessoa...');
  const pessoaRaw = extractTableData('pessoa');
  const lines = pessoaRaw.split('\n');

  let copyLine = '';
  const dataLines: string[] = [];
  let inData = false;

  for (const line of lines) {
    if (line.startsWith('COPY destinocertoroteiros.pessoa ')) {
      copyLine = line;
      inData = true;
      continue;
    }
    if (inData) {
      if (line.startsWith('\\.')) {
        inData = false;
        break;
      }
      if (line.trim()) {
        dataLines.push(line);
      }
    }
  }

  const colMatch = copyLine.match(/\((.*)\)/);
  if (!colMatch) throw new Error('Não foi possível identificar as colunas de pessoa no dump');
  const columns = colMatch[1].split(', ').map((c) => c.trim());
  const colIdx: Record<string, number> = {};
  columns.forEach((c, i) => (colIdx[c] = i));

  const customers: any[] = [];
  const suppliers: any[] = [];

  for (const line of dataLines) {
    const parts = line.split('\t');
    const getVal = (col: string) => cleanVal(parts[colIdx[col]]);

    const pessoaId = getVal('pessoa_id');
    if (!pessoaId) continue;

    const nome = getVal('nome') || 'Sem Nome';
    const tipo = getVal('tipo') || 'F';
    const cidId = getVal('cidade_id');
    const cidInfo = cidId ? cidades.get(cidId) : null;
    const tags = pessoaMarcadores.get(pessoaId) || [];

    if (tipo === 'F') {
      customers.push({
        mondeId: pessoaId,
        name: nome,
        cpf: getVal('cpf'),
        rg: getVal('rg'),
        passport: getVal('numero_passaporte'),
        birthDate: parseDate(getVal('data_nascimento')),
        gender: getVal('sexo'),
        phone: getVal('telefone') || getVal('telefone_comercial'),
        mobile: getVal('telefone_celular'),
        email: getVal('email'),
        address: getVal('endereco'),
        number: getVal('numero'),
        complement: getVal('complemento'),
        neighborhood: getVal('bairro'),
        city: cidInfo?.nome || null,
        state: cidInfo?.uf || null,
        zipCode: getVal('cep'),
        notes: getVal('observacoes'),
        firstSaleDate: parseDate(getVal('data_primeira_venda')),
        lastSaleDate: parseDate(getVal('data_ultima_venda')),
      });
    } else {
      // Determinar Categoria do Fornecedor
      let category = tags.find((t) =>
        ['Hotéis', 'Operadoras', 'Cias Aéreas', 'Locadora de Veículos', 'Consolidadores'].includes(t)
      );

      if (!category) {
        const upper = (nome + ' ' + (getVal('razao_social') || '')).toUpperCase();
        if (upper.includes('HOTEL') || upper.includes('POUSADA') || upper.includes('RESORT') || upper.includes('FLAT') || upper.includes('INN')) {
          category = 'Hotéis';
        } else if (upper.includes('AIRLINES') || upper.includes('LINHAS AEREAS') || upper.includes('AVIANCA') || upper.includes('GOL') || upper.includes('LATAM') || upper.includes('AZUL')) {
          category = 'Cias Aéreas';
        } else if (upper.includes('LOCADORA') || upper.includes('RENT A CAR') || upper.includes('MOVIDA') || upper.includes('LOCALIZA') || upper.includes('UNIDAS')) {
          category = 'Locadora de Veículos';
        } else if (upper.includes('OPERADORA') || upper.includes('TURISMO') || upper.includes('VIAGENS') || upper.includes('CVC')) {
          category = 'Operadoras';
        } else if (upper.includes('BANCO') || upper.includes('BRADESCO') || upper.includes('ITAU') || upper.includes('SANTANDER') || upper.includes('CAIXA')) {
          category = 'Financeiro / Banco';
        } else if (upper.includes('SEGURO') || upper.includes('ASSIST')) {
          category = 'Seguros & Assistência';
        } else {
          category = 'Parceiro Geral';
        }
      }

      suppliers.push({
        mondeId: pessoaId,
        name: nome,
        tradeName: getVal('razao_social'),
        cnpj: getVal('cnpj'),
        ie: getVal('ie'),
        category: category,
        phone: getVal('telefone') || getVal('telefone_comercial'),
        mobile: getVal('telefone_celular'),
        email: getVal('email'),
        website: getVal('website'),
        address: getVal('endereco'),
        number: getVal('numero'),
        complement: getVal('complemento'),
        neighborhood: getVal('bairro'),
        city: cidInfo?.nome || null,
        state: cidInfo?.uf || null,
        zipCode: getVal('cep'),
        notes: getVal('observacoes'),
      });
    }
  }

  console.log(`📦 Preparados para inserção:`);
  console.log(`   - Clientes (PF): ${customers.length}`);
  console.log(`   - Fornecedores (PJ): ${suppliers.length}`);

  // Inserção em lotes de 500
  console.log('💾 Inserindo Clientes no PostgreSQL...');
  const batchSize = 500;
  for (let i = 0; i < customers.length; i += batchSize) {
    const chunk = customers.slice(i, i + batchSize);
    await prisma.customer.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    process.stdout.write(`   Inseridos ${Math.min(i + batchSize, customers.length)} de ${customers.length} clientes\r`);
  }
  console.log(`\n✅ ${customers.length} Clientes inseridos com sucesso!`);

  console.log('💾 Inserindo Fornecedores no PostgreSQL...');
  for (let i = 0; i < suppliers.length; i += batchSize) {
    const chunk = suppliers.slice(i, i + batchSize);
    await prisma.supplier.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    process.stdout.write(`   Inseridos ${Math.min(i + batchSize, suppliers.length)} de ${suppliers.length} fornecedores\r`);
  }
  console.log(`\n✅ ${suppliers.length} Fornecedores inseridos com sucesso!`);

  const totalC = await prisma.customer.count();
  const totalS = await prisma.supplier.count();
  console.log(`\n🎉 Finalizado! Total no banco:`);
  console.log(`   - Clientes: ${totalC}`);
  console.log(`   - Fornecedores: ${totalS}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na importação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
