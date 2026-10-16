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

function parseLines(raw: string, copyPrefix: string): { columns: string[]; colIdx: Record<string, number>; rows: string[][] } {
  const lines = raw.split('\n');
  const copyLine = lines.find((l) => l.startsWith(copyPrefix)) || '';
  const colMatch = copyLine.match(/\((.*)\)/);
  const columns = colMatch ? colMatch[1].split(', ').map((c) => c.trim()) : [];
  const colIdx: Record<string, number> = {};
  columns.forEach((c, i) => (colIdx[c] = i));

  const rows: string[][] = [];
  let inData = false;
  for (const line of lines) {
    if (line.startsWith(copyPrefix)) {
      inData = true;
      continue;
    }
    if (inData) {
      if (line.startsWith('\\.')) break;
      if (line.trim() && !line.startsWith('--')) {
        rows.push(line.split('\t'));
      }
    }
  }
  return { columns, colIdx, rows };
}

async function main() {
  console.log('🚀 Iniciando Carga Completa do Monde ERP no Destino Certo...');
  console.log('📁 Arquivo de dump utilizado:', dumpPath);

  // ========================================================
  // 1. IMPORTAÇÃO DE CONTAS BANCÁRIAS (conta -> BankAccount)
  // ========================================================
  console.log('\n🏦 1. Extraindo Contas Bancárias (conta)...');
  const contaRaw = execSync(`"${pgRestore}" -a -t conta -f - "${dumpPath}"`, {
    maxBuffer: 20 * 1024 * 1024,
    encoding: 'utf8',
  });
  const contaData = parseLines(contaRaw, 'COPY destinocertoroteiros.conta ');

  for (const parts of contaData.rows) {
    const cId = cleanVal(parts[contaData.colIdx['conta_id']]);
    const nome = cleanVal(parts[contaData.colIdx['descricao']]) || 'Conta Sem Nome';
    const banco = cleanVal(parts[contaData.colIdx['banco']]);
    const agencia = cleanVal(parts[contaData.colIdx['agencia']]);
    const contaNum = cleanVal(parts[contaData.colIdx['numero']]);
    const saldoInicial = parseFloat(cleanVal(parts[contaData.colIdx['saldo_inicial']]) || '0') || 0;

    let type = 'CORRENTE';
    const upperNome = nome.toUpperCase();
    if (upperNome.includes('APLICAÇÃO') || upperNome.includes('APLICACAO') || upperNome.includes('INVESTIMENTO')) {
      type = 'APLICACAO';
    } else if (upperNome.includes('CARTÃO') || upperNome.includes('CARTAO')) {
      type = 'CARTAO';
    } else if (upperNome.includes('DINHEIRO') || upperNome.includes('CAIXA')) {
      type = 'CAIXA';
    }

    if (cId) {
      await prisma.bankAccount.upsert({
        where: { mondeId: cId },
        update: {
          name: nome,
          bankCode: banco,
          agency: agencia,
          accountNumber: contaNum,
          type,
        },
        create: {
          mondeId: cId,
          name: nome,
          bankCode: banco,
          agency: agencia,
          accountNumber: contaNum,
          type,
          initialBalance: saldoInicial,
        },
      });
    }
  }
  const bankAccounts = await prisma.bankAccount.findMany();
  const accountMap = new Map(bankAccounts.map((a) => [a.mondeId!, a.id]));
  console.log(`✅ ${bankAccounts.length} Contas Bancárias sincronizadas!`);

  // ========================================================
  // 2. IMPORTAÇÃO DE VENDEDORES (vendedor -> Seller)
  // ========================================================
  console.log('\n💼 2. Extraindo Vendedores (vendedor)...');
  const pessoaRaw = execSync(`"${pgRestore}" -a -t pessoa -f - "${dumpPath}"`, {
    maxBuffer: 60 * 1024 * 1024,
    encoding: 'utf8',
  });
  const pessoaData = parseLines(pessoaRaw, 'COPY destinocertoroteiros.pessoa ');
  const pessoaMap = new Map<string, { nome: string; doc: string; email: string | null; phone: string | null }>();
  for (const parts of pessoaData.rows) {
    const pId = cleanVal(parts[pessoaData.colIdx['pessoa_id']]);
    if (pId) {
      pessoaMap.set(pId, {
        nome: cleanVal(parts[pessoaData.colIdx['nome']]) || 'Sem Nome',
        doc: cleanVal(parts[pessoaData.colIdx['cpf']]) || cleanVal(parts[pessoaData.colIdx['cnpj']]) || '',
        email: cleanVal(parts[pessoaData.colIdx['email']]),
        phone: cleanVal(parts[pessoaData.colIdx['telefone_celular']]) || cleanVal(parts[pessoaData.colIdx['telefone']]),
      });
    }
  }

  const vendRaw = execSync(`"${pgRestore}" -a -t vendedor -f - "${dumpPath}"`, {
    maxBuffer: 20 * 1024 * 1024,
    encoding: 'utf8',
  });
  const vendData = parseLines(vendRaw, 'COPY destinocertoroteiros.vendedor ');
  for (const parts of vendData.rows) {
    const vId = cleanVal(parts[vendData.colIdx['vendedor_id']]);
    const ativo = cleanVal(parts[vendData.colIdx['ativo']]) === 't';
    const pInfo = vId ? pessoaMap.get(vId) : null;
    const nome = pInfo?.nome || `Vendedor ${vId?.slice(0, 6)}`;
    const comissao = parseFloat(cleanVal(parts[vendData.colIdx['comissao']]) || '0') || 0;

    if (vId) {
      await prisma.seller.upsert({
        where: { mondeId: vId },
        update: {
          name: nome,
          commissionRate: comissao,
          email: pInfo?.email,
          phone: pInfo?.phone,
          active: ativo,
        },
        create: {
          mondeId: vId,
          name: nome,
          commissionRate: comissao,
          email: pInfo?.email,
          phone: pInfo?.phone,
          active: ativo,
        },
      });
    }
  }
  const sellers = await prisma.seller.findMany();
  const sellerMap = new Map(sellers.map((s) => [s.mondeId!, s.id]));
  console.log(`✅ ${sellers.length} Vendedores sincronizados!`);

  // ========================================================
  // 3. MAPAS AUXILIARES (Clientes e Títulos Financeiros)
  // ========================================================
  console.log('\n🔍 Mapeando Clientes e Títulos Financeiros existentes...');
  const [allCustomers, allSuppliers, allFin] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, mondeId: true, name: true } }),
    prisma.supplier.findMany({ select: { id: true, mondeId: true, name: true } }),
    prisma.financialEntry.findMany({ select: { id: true, mondeId: true } }),
  ]);
  const customerMap = new Map(allCustomers.filter((c) => c.mondeId).map((c) => [c.mondeId!, c.id]));
  const supplierMap = new Map(allSuppliers.filter((s) => s.mondeId).map((s) => [s.mondeId!, s.id]));
  const financialMap = new Map(allFin.filter((f) => f.mondeId).map((f) => [f.mondeId!, f.id]));

  // Mapa de financeiro do dump para informações da transação
  const finRaw = execSync(`"${pgRestore}" -a -t financeiro -f - "${dumpPath}"`, {
    maxBuffer: 100 * 1024 * 1024,
    encoding: 'utf8',
  });
  const finData = parseLines(finRaw, 'COPY destinocertoroteiros.financeiro ');
  const finDumpMap = new Map<string, { pessoaId: string | null; desc: string; doc: string | null }>();
  for (const parts of finData.rows) {
    const fId = cleanVal(parts[finData.colIdx['financeiro_id']]);
    if (fId) {
      finDumpMap.set(fId, {
        pessoaId: cleanVal(parts[finData.colIdx['pessoa_id']]),
        desc: cleanVal(parts[finData.colIdx['descricao']]) || 'Lançamento financeiro',
        doc: cleanVal(parts[finData.colIdx['documento']]),
      });
    }
  }

  // ========================================================
  // 4. EXTRATO BANCÁRIO & CONCILIAÇÃO (conta_movimento)
  // ========================================================
  console.log('\n💳 3. Extraindo Extrato Bancário (conta_movimento)...');
  const cmRaw = execSync(`"${pgRestore}" -a -t conta_movimento -f - "${dumpPath}"`, {
    maxBuffer: 80 * 1024 * 1024,
    encoding: 'utf8',
  });
  const cmData = parseLines(cmRaw, 'COPY destinocertoroteiros.conta_movimento ');

  const bankTransactions: any[] = [];
  for (const parts of cmData.rows) {
    const cmId = cleanVal(parts[cmData.colIdx['conta_movimento_id']]);
    const cId = cleanVal(parts[cmData.colIdx['conta_id']]);
    const dt = parseDate(cleanVal(parts[cmData.colIdx['data']]));
    const val = parseFloat(cleanVal(parts[cmData.colIdx['valor']]) || '0');
    if (!cmId || !cId || !dt || isNaN(val)) continue;

    const accountDbId = accountMap.get(cId);
    if (!accountDbId) continue;

    const fId = cleanVal(parts[cmData.colIdx['financeiro_id']]);
    const finDbId = fId ? financialMap.get(fId) || null : null;
    const finDumpInfo = fId ? finDumpMap.get(fId) : null;

    let pName = cleanVal(parts[cmData.colIdx['cartao_nome']]);
    let pDoc = cleanVal(parts[cmData.colIdx['cpf_cnpj']]);
    if (!pName && finDumpInfo?.pessoaId) {
      const p = pessoaMap.get(finDumpInfo.pessoaId);
      pName = p?.nome || null;
      pDoc = p?.doc || null;
    }

    const desc = cleanVal(parts[cmData.colIdx['descricao']]) || finDumpInfo?.desc || (val < 0 ? 'Pagamento' : 'Recebimento');
    const doc = cleanVal(parts[cmData.colIdx['documento']]) || finDumpInfo?.doc;

    bankTransactions.push({
      mondeId: cmId,
      accountId: accountDbId,
      financialEntryId: finDbId,
      date: dt,
      amount: val,
      description: desc,
      document: doc,
      personName: pName,
      personDoc: pDoc,
      isReconciled: true,
    });
  }

  console.log(`💾 Inserindo ${bankTransactions.length} movimentações de extrato no PostgreSQL...`);
  const bSize = 1000;
  for (let i = 0; i < bankTransactions.length; i += bSize) {
    const chunk = bankTransactions.slice(i, i + bSize);
    await prisma.bankTransaction.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    process.stdout.write(`   Inseridos ${Math.min(i + bSize, bankTransactions.length)} de ${bankTransactions.length} extratos\r`);
  }
  const totalBT = await prisma.bankTransaction.count();
  console.log(`\n✅ ${totalBT} Transações Bancárias registradas com sucesso!`);

  // ========================================================
  // 5. IMPORTAÇÃO DE VENDAS (vendas -> Sale)
  // ========================================================
  console.log('\n🛒 4. Extraindo Vendas (vendas)...');
  const vendasRaw = execSync(`"${pgRestore}" -a -t vendas -f - "${dumpPath}"`, {
    maxBuffer: 60 * 1024 * 1024,
    encoding: 'utf8',
  });
  const vendasData = parseLines(vendasRaw, 'COPY destinocertoroteiros.vendas ');

  // Mapear primeiro as que já existem
  const existingSalesMap = new Map(
    (await prisma.sale.findMany({ select: { id: true, saleNumber: true, status: true } })).map((s) => [s.saleNumber, s])
  );

  const salesToInsert: any[] = [];
  const salesToUpdateStatus: { id: string; status: any }[] = [];
  const vendaMondeToDbMap = new Map<string, any>();

  for (const parts of vendasData.rows) {
    const vId = cleanVal(parts[vendasData.colIdx['id']]);
    const num = cleanVal(parts[vendasData.colIdx['numero']]);
    const paganteId = cleanVal(parts[vendasData.colIdx['pagante_id']]);
    if (!vId || !num || !paganteId) continue;

    const customerDbId = customerMap.get(paganteId);
    if (!customerDbId) continue; // Pagante precisa existir como cliente

    const sellerMondeId = cleanVal(parts[vendasData.colIdx['vendedor_id']]);
    const sellerDbId = sellerMondeId ? sellerMap.get(sellerMondeId) || null : null;

    const dataVenda = parseDate(cleanVal(parts[vendasData.colIdx['data_venda']])) || new Date();
    const dataEmbarque = parseDate(cleanVal(parts[vendasData.colIdx['data_embarque']]));
    const dataRetorno = parseDate(cleanVal(parts[vendasData.colIdx['data_retorno']]));

    const totalProd = parseFloat(cleanVal(parts[vendasData.colIdx['total_produtos']]) || '0') || 0;
    const totalTax = parseFloat(cleanVal(parts[vendasData.colIdx['total_taxas']]) || '0') || 0;
    const servFee = parseFloat(cleanVal(parts[vendasData.colIdx['fee_agencia']]) || '0') || 0;
    const desc = parseFloat(cleanVal(parts[vendasData.colIdx['total_desconto']]) || '0') || 0;
    const finalVal = parseFloat(cleanVal(parts[vendasData.colIdx['valor_final']]) || '0') || (totalProd + totalTax);

    const situacao = cleanVal(parts[vendasData.colIdx['situacao']]) || 'CONFIRMADA';
    let status: any = 'CONFIRMADA';
    if (situacao === 'C' || situacao.includes('CANCEL') || situacao.includes('Cancel')) status = 'CANCELADA';
    else if (situacao === 'A' || situacao.includes('ORCA') || situacao.includes('Orça')) status = 'ORCAMENTO';

    const obs = cleanVal(parts[vendasData.colIdx['observacoes']]);
    const obsFin = cleanVal(parts[vendasData.colIdx['obs_financeiro']]);

    vendaMondeToDbMap.set(vId, num);

    const existing = existingSalesMap.get(num);
    if (!existing) {
      salesToInsert.push({
        mondeId: vId,
        saleNumber: num,
        customerId: customerDbId,
        sellerId: sellerDbId,
        saleDate: dataVenda,
        departureDate: dataEmbarque,
        returnDate: dataRetorno,
        status,
        totalProducts: totalProd,
        totalTaxes: totalTax,
        serviceFee: servFee,
        discount: desc,
        finalAmount: finalVal,
        notes: obs,
        financialNotes: obsFin,
      });
    } else if (existing.status !== status) {
      salesToUpdateStatus.push({ id: existing.id, status });
    }
  }

  if (salesToInsert.length > 0) {
    console.log(`💾 Inserindo ${salesToInsert.length} novas Vendas no PostgreSQL...`);
    for (let i = 0; i < salesToInsert.length; i += 500) {
      const chunk = salesToInsert.slice(i, i + 500);
      await prisma.sale.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      process.stdout.write(`   Inseridas ${Math.min(i + 500, salesToInsert.length)} de ${salesToInsert.length} vendas\r`);
    }
    console.log(`\n✅ Novas Vendas inseridas com sucesso!`);
  }

  if (salesToUpdateStatus.length > 0) {
    console.log(`🔄 Atualizando status de ${salesToUpdateStatus.length} vendas existentes...`);
    for (const item of salesToUpdateStatus) {
      await prisma.sale.update({
        where: { id: item.id },
        data: { status: item.status },
      });
    }
    console.log(`✅ Status de vendas atualizados com sucesso!`);
  }
  const allSalesDb = await prisma.sale.findMany({ select: { id: true, mondeId: true, saleNumber: true } });
  const saleMap = new Map(allSalesDb.filter((s) => s.mondeId).map((s) => [s.mondeId!, s.id]));
  console.log(`✅ Total de Vendas no sistema: ${allSalesDb.length}`);

  // ========================================================
  // 6. ITENS DE VENDA (vendas_produtos -> SaleItem)
  // ========================================================
  console.log('\n📦 5. Extraindo Itens de Vendas (vendas_produtos)...');
  const vpRaw = execSync(`"${pgRestore}" -a -t vendas_produtos -f - "${dumpPath}"`, {
    maxBuffer: 80 * 1024 * 1024,
    encoding: 'utf8',
  });
  const vpData = parseLines(vpRaw, 'COPY destinocertoroteiros.vendas_produtos ');

  const saleItems: any[] = [];
  const vpMondeToSaleDb = new Map<string, string>();

  for (const parts of vpData.rows) {
    const vpId = cleanVal(parts[vpData.colIdx['vendas_produtos_id']]);
    const vId = cleanVal(parts[vpData.colIdx['vendas_id']]);
    if (!vpId || !vId) continue;

    const saleDbId = saleMap.get(vId);
    if (!saleDbId) continue;

    vpMondeToSaleDb.set(vpId, saleDbId);

    const desc = cleanVal(parts[vpData.colIdx['descricao']]) || cleanVal(parts[vpData.colIdx['nome_pacote']]) || 'Item de viagem';
    const dtInicio = parseDate(cleanVal(parts[vpData.colIdx['data_inicio']]));
    const dtFim = parseDate(cleanVal(parts[vpData.colIdx['data_fim']]));
    const qtd = parseInt(cleanVal(parts[vpData.colIdx['quantidade']]) || '1') || 1;
    const unitPrice = parseFloat(cleanVal(parts[vpData.colIdx['valor_unitario']]) || '0') || 0;
    const taxAmount = parseFloat(cleanVal(parts[vpData.colIdx['taxas_unitario']]) || '0') || 0;
    const totalAmount = parseFloat(cleanVal(parts[vpData.colIdx['valor_total']]) || '0') || (unitPrice * qtd);

    let type = 'PACOTE';
    const upperDesc = desc.toUpperCase();
    if (upperDesc.includes('AEREO') || upperDesc.includes('AÉREO') || upperDesc.includes('VOO') || upperDesc.includes('PASSAGEM')) {
      type = 'AEREO';
    } else if (upperDesc.includes('HOTEL') || upperDesc.includes('POUSADA') || upperDesc.includes('RESORT') || upperDesc.includes('HOSPEDAGEM')) {
      type = 'HOSPEDAGEM';
    } else if (upperDesc.includes('SEGURO') || upperDesc.includes('ASSISTENCIA')) {
      type = 'SEGURO';
    } else if (upperDesc.includes('TRANSFER') || upperDesc.includes('TRASLADO') || upperDesc.includes('RODOVIARIO')) {
      type = 'TRANSFER';
    } else if (upperDesc.includes('CRUZEIRO') || upperDesc.includes('NAVIO')) {
      type = 'CRUZEIRO';
    }

    const fornecId = cleanVal(parts[vpData.colIdx['fornecimento_id']]);
    const suppDbId = fornecId ? supplierMap.get(fornecId) || null : null;

    saleItems.push({
      saleId: saleDbId,
      supplierId: suppDbId,
      type,
      description: desc,
      startDate: dtInicio,
      endDate: dtFim,
      quantity: qtd,
      unitPrice,
      taxAmount,
      totalAmount,
      locCode: cleanVal(parts[vpData.colIdx['documento']]),
      roomType: cleanVal(parts[vpData.colIdx['tipo_acomodacao']]),
      boardType: cleanVal(parts[vpData.colIdx['regime']]),
    });
  }

  const salesWithItems = new Set(
    (await prisma.saleItem.groupBy({ by: ['saleId'] })).map((g) => g.saleId)
  );
  const itemsToInsert = saleItems.filter((item) => !salesWithItems.has(item.saleId));

  if (itemsToInsert.length > 0) {
    console.log(`💾 Inserindo ${itemsToInsert.length} novos Itens de Vendas...`);
    for (let i = 0; i < itemsToInsert.length; i += 1000) {
      const chunk = itemsToInsert.slice(i, i + 1000);
      await prisma.saleItem.createMany({ data: chunk });
      process.stdout.write(`   Inseridos ${Math.min(i + 1000, itemsToInsert.length)} de ${itemsToInsert.length} itens\r`);
    }
    console.log(`\n✅ Novos Itens de Vendas inseridos!`);
  } else {
    console.log(`ℹ️ Nenhum novo item de venda a inserir.`);
  }
  const totalItems = await prisma.saleItem.count();
  console.log(`✅ Total de Itens de Venda registrados: ${totalItems}`);

  // ========================================================
  // 7. PASSAGEIROS POR VENDA (vendas_produtos_passageiros)
  // ========================================================
  console.log('\n👥 6. Extraindo Passageiros por Venda...');
  const vppRaw = execSync(`"${pgRestore}" -a -t vendas_produtos_passageiros -f - "${dumpPath}"`, {
    maxBuffer: 80 * 1024 * 1024,
    encoding: 'utf8',
  });
  const vppData = parseLines(vppRaw, 'COPY destinocertoroteiros.vendas_produtos_passageiros ');

  const salePassengersMap = new Map<string, any>();
  for (const parts of vppData.rows) {
    const vpId = cleanVal(parts[vppData.colIdx['vendas_produtos_id']]);
    const pId = cleanVal(parts[vppData.colIdx['pessoa_id']]);
    if (!vpId || !pId) continue;

    const saleDbId = vpMondeToSaleDb.get(vpId);
    const custDbId = customerMap.get(pId);
    if (!saleDbId || !custDbId) continue;

    const uniqueKey = `${saleDbId}___${custDbId}`;
    if (!salePassengersMap.has(uniqueKey)) {
      salePassengersMap.set(uniqueKey, {
        saleId: saleDbId,
        customerId: custDbId,
        role: 'PASSAGEIRO',
        seatNumber: cleanVal(parts[vppData.colIdx['assento']]),
        ticketCode: cleanVal(parts[vppData.colIdx['documento']]),
      });
    }
  }

  const passengersToInsert = Array.from(salePassengersMap.values());
  if (passengersToInsert.length > 0) {
    console.log(`💾 Inserindo vínculos de Passageiros em Vendas (${passengersToInsert.length} registros)...`);
    for (let i = 0; i < passengersToInsert.length; i += 1000) {
      const chunk = passengersToInsert.slice(i, i + 1000);
      await prisma.salePassenger.createMany({ data: chunk, skipDuplicates: true });
      process.stdout.write(`   Processados ${Math.min(i + 1000, passengersToInsert.length)} de ${passengersToInsert.length} passageiros\r`);
    }
    console.log(`\n✅ Passageiros vinculados às Vendas com sucesso!`);
  }
  const totalPass = await prisma.salePassenger.count();
  console.log(`✅ Total de vínculos de Passageiros: ${totalPass}`);

  // ========================================================
  // 8. CRM DE TAREFAS & HISTÓRICO (tarefa -> Task)
  // ========================================================
  console.log('\n📝 7. Extraindo Tarefas e Histórico de CRM (tarefa)...');
  const tarRaw = execSync(`"${pgRestore}" -a -t tarefa -f - "${dumpPath}"`, {
    maxBuffer: 40 * 1024 * 1024,
    encoding: 'utf8',
  });
  const tarData = parseLines(tarRaw, 'COPY destinocertoroteiros.tarefa ');

  const tasksToInsert: any[] = [];
  for (const parts of tarData.rows) {
    const tId = cleanVal(parts[tarData.colIdx['tarefa_id']]);
    const tit = cleanVal(parts[tarData.colIdx['titulo']]) || 'Atendimento / Tarefa';
    const desc = cleanVal(parts[tarData.colIdx['descricao']]);
    const dtLimite = parseDate(cleanVal(parts[tarData.colIdx['data_limite']]));
    const statusStr = cleanVal(parts[tarData.colIdx['status']]) || 'PENDENTE';
    const pId = cleanVal(parts[tarData.colIdx['pessoa_id']]);
    const custDbId = pId ? customerMap.get(pId) || null : null;

    let priority = 'MEDIA';
    const prioridadeStr = cleanVal(parts[tarData.colIdx['prioridade']]) || '';
    if (prioridadeStr === 'A' || prioridadeStr === 'U') priority = 'ALTA';
    else if (prioridadeStr === 'B') priority = 'BAIXA';

    let status = 'PENDENTE';
    if (statusStr === 'C' || statusStr.includes('Concl')) status = 'CONCLUIDA';
    else if (statusStr === 'E' || statusStr.includes('Andam')) status = 'EM_ANDAMENTO';

    if (tId) {
      tasksToInsert.push({
        mondeId: tId,
        title: tit,
        description: desc,
        category: 'Atendimento',
        priority,
        status,
        dueDate: dtLimite,
        customerId: custDbId,
      });
    }
  }

  if (tasksToInsert.length > 0) {
    console.log(`💾 Inserindo Tarefas de CRM (${tasksToInsert.length} registros)...`);
    await prisma.task.createMany({ data: tasksToInsert, skipDuplicates: true });
    console.log(`✅ Tarefas de CRM inseridas com sucesso!`);
  }
  const totalTasks = await prisma.task.count();
  console.log(`✅ Total de Tarefas no sistema: ${totalTasks}`);

  console.log('\n🎉 CARGA COMPLETA DO MONDE CONCLUÍDA COM SUCESSO! 🎉');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  🏦 Contas Bancárias:        ${bankAccounts.length}`);
  console.log(`  💳 Transações/Extrato:      ${totalBT}`);
  console.log(`  💼 Vendedores Cadastrados:  ${sellers.length}`);
  console.log(`  🛒 Vendas Registradas:      ${allSalesDb.length}`);
  console.log(`  📦 Itens/Serviços Vendidos: ${totalItems}`);
  console.log(`  👥 Passageiros Vinculados:  ${totalPass}`);
  console.log(`  📝 Tarefas de CRM:          ${totalTasks}`);
  console.log('─────────────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Erro na carga do Monde:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
