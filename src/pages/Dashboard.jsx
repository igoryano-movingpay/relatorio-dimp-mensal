import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CaretDown, Check, CalendarBlank, ArrowsLeftRight } from "@phosphor-icons/react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const getPreviousMonth = (dateString) => {
  let y, m;
  if (!dateString) {
    const d = new Date();
    y = d.getFullYear();
    m = d.getMonth() + 1; // 1 to 12
  } else {
    const parts = dateString.split('/');
    m = parseInt(parts[0], 10);
    y = parseInt(parts[1], 10);
  }
  
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${String(m).padStart(2, '0')}/${y}`;
};

const CompanyTable = ({ title, data, otherData = [], loading, selectedCompanies, compareMode }) => {
  // If in compareMode, we get the union of IDs between data and otherData
  const relevantIds = new Set([
    ...data.map(d => d.empresa_id),
    ...(compareMode ? otherData.map(d => d.empresa_id) : [])
  ].filter(id => selectedCompanies.includes(id)));

  // Map to get unique items, inserting dummy ones where they are missing in current `data`
  const displayData = Array.from(relevantIds).map(id => {
    const actualItem = data.find(d => d.empresa_id === id);
    if (actualItem) return actualItem;

    // Se nao tem na tabela atual, criamos um registro vazio para manter o alinhamento
    const fallbackItem = otherData.find(d => d.empresa_id === id);
    return {
      empresa_id: id,
      empresa_nome: fallbackItem?.empresa_nome || `Empresa ${id}`,
      total_clientes: null,
      total_transacoes: null,
      valor_transacoes: null,
      isEmpty: true
    };
  }).sort((a, b) => (a.empresa_nome || "").localeCompare(b.empresa_nome || ""));

  return (
    <Card className="border-none shadow-lg w-full h-fit flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
      <CardHeader className="bg-white dark:bg-zinc-900 px-5 py-3 border-none shadow-sm z-10">
        <CardTitle className="text-xl text-slate-900 dark:text-zinc-100 font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full bg-white dark:bg-zinc-900">
          <Table>
            <TableHeader className="bg-slate-200 dark:bg-zinc-800">
              <TableRow className="hover:bg-slate-200 dark:hover:bg-zinc-800 border-b-slate-300 dark:border-b-zinc-700 border-b">
                <TableHead className="font-bold text-slate-700 dark:text-zinc-300 h-10 px-4">Empresa</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-zinc-300 text-center h-10 px-4">N° de Clientes</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-zinc-300 text-center h-10 px-4">N° de Transações</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-zinc-300 text-right h-10 px-4">Valores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500 dark:text-zinc-400 font-medium">
                    Carregando relatório...
                  </TableCell>
                </TableRow>
              ) : displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500 dark:text-zinc-400 font-medium">
                    Nenhum dado encontrado para exibição. Verifique os filtros.
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((item, index) => (
                  <TableRow 
                    key={item.empresa_id} 
                    className={`border-b-slate-100 dark:border-b-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/50 dark:bg-zinc-800/40'}`}
                  >
                    <TableCell className="font-medium text-slate-900 dark:text-zinc-100 px-4 py-2 border-r border-transparent">{item.empresa_nome}</TableCell>
                    <TableCell className="text-center text-slate-600 dark:text-zinc-300 px-4 py-2 border-r border-transparent">
                       {item.isEmpty ? '---' : item.total_clientes}
                    </TableCell>
                    <TableCell className="text-center text-slate-600 dark:text-zinc-300 px-4 py-2 border-r border-transparent">
                       {item.isEmpty ? '---' : item.total_transacoes}
                    </TableCell>
                    <TableCell className="text-right text-slate-900 dark:text-zinc-100 font-semibold px-4 py-2">
                       {item.isEmpty ? '---' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_transacoes / 100)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  
  // -- STATES --
  const [sessionPeriod, setSessionPeriod] = useState(getPreviousMonth());
  const [inputPeriod, setInputPeriod] = useState(getPreviousMonth()); // input mask field

  const [compareMode, setCompareMode] = useState(false);

  const [mainData, setMainData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Companies List & Cache
  const [allCompanies, setAllCompanies] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("movingpay_companies")) || [];
    } catch { return []; }
  });
  
  const [selectedCompanies, setSelectedCompanies] = useState(() => {
    try {
      const saved = localStorage.getItem("movingpay_selected_companies");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
      // Se não havia nada salvo no selected, mas já tinha companies antes, default para TUDO selecionado.
      const savedComps = localStorage.getItem("movingpay_companies");
      if (savedComps) {
         const parsedComps = JSON.parse(savedComps);
         if (parsedComps && parsedComps.length > 0) return parsedComps.map(c => c.empresa_id);
      }
      return [];
    } catch { return []; }
  });
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [searchCompany, setSearchCompany] = useState("");

  const filteredCompanies = allCompanies.filter(emp => 
    (emp.empresa_nome || "").toLowerCase().includes(searchCompany.toLowerCase()) || 
    emp.empresa_id.toString().includes(searchCompany)
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Se por um acaso ficar nulo, salvamos como null pra nao travar no cache
    if (selectedCompanies.length === 0 && allCompanies.length > 0 && !localStorage.getItem("movingpay_first_load")) {
       return; // aguarda a inicialização e nao salva vazio
    }
    localStorage.setItem("movingpay_selected_companies", JSON.stringify(selectedCompanies));
  }, [selectedCompanies, allCompanies]);

  useEffect(() => {
    localStorage.setItem("movingpay_companies", JSON.stringify(allCompanies));
  }, [allCompanies]);

  // -- API CALL --
  const fetchPeriodData = async (periodString) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return null;
    }

    try {
      // Usando o proxy do Vite para evitar bloqueios de CORS do navegador.
      const response = await fetch(`/regulatorios/api/v1/suporte/buscar-resumo-mensal?periodo=${encodeURIComponent(periodString)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        let rawResult = await response.json();
        console.log("Raw API Response:", rawResult); // Ajuda na depuração (F12)
        
        // Flexibiliza caso a API mande os dados como { data: [] }, { relatorio: [] }, { items: [] }, etc.
        let result = [];
        if (Array.isArray(rawResult)) {
          result = rawResult;
        } else if (rawResult.data && Array.isArray(rawResult.data)) {
          result = rawResult.data;
        } else if (rawResult.relatorio && Array.isArray(rawResult.relatorio)) {
          result = rawResult.relatorio;
        } else if (rawResult.items && Array.isArray(rawResult.items)) {
          result = rawResult.items;
        } else {
          // Última tentativa: procura qualquer propriedade dentro do objeto que seja um array
          result = Object.values(rawResult).find(val => Array.isArray(val)) || [];
        }
        
        // Filtra possíveis múltiplos processamentos para a mesma empresa:
        // mantem apenas o que possuir o dt_inicio_revisao mais recente
        const uniqueItemsMap = new Map();
        for (const item of result) {
          if (!item.empresa_id) continue;
          
          if (!uniqueItemsMap.has(item.empresa_id)) {
             uniqueItemsMap.set(item.empresa_id, item);
          } else {
             const existing = uniqueItemsMap.get(item.empresa_id);
             // Tenta converter para timestamp pra comparar. Se for inválido/vazio, assume 0
             const existingTime = existing.dt_inicio_revisao ? new Date(existing.dt_inicio_revisao).getTime() || 0 : 0;
             const newTime = item.dt_inicio_revisao ? new Date(item.dt_inicio_revisao).getTime() || 0 : 0;
             
             if (newTime > existingTime) {
                uniqueItemsMap.set(item.empresa_id, item);
             }
          }
        }
        
        // --- CLIENTES OBRIGATÓRIOS ---
        // Se a API não retornou estes clientes no mês consultado, injetá-los zerados
        const requiredCompanies = [
          { empresa_id: 12, empresa_nome: "AIQFOME" },
          { empresa_id: 19, empresa_nome: "BASF SA" },
          { empresa_id: 3, empresa_nome: "PAGOLIVRE" },
          { empresa_id: 22, empresa_nome: "RAPPI" }
        ];

        for (const reqComp of requiredCompanies) {
          if (!uniqueItemsMap.has(reqComp.empresa_id)) {
            uniqueItemsMap.set(reqComp.empresa_id, {
              empresa_id: reqComp.empresa_id,
              empresa_nome: reqComp.empresa_nome,
              total_clientes: "Zerado",
              total_transacoes: "Zerado",
              valor_transacoes: "0",
              total_cancelamentos: "0",
              valor_cancelamentos: "0"
            });
          }
        }

        result = Array.from(uniqueItemsMap.values());

        // Populate missing companies directly using a simple loop to extract values
        const fetchedIds = [];
        setAllCompanies(prev => {
          const map = new Map(prev.map(c => [c.empresa_id, c]));
          let modified = false;
          
          result.forEach(item => {
            if (item.empresa_id && item.empresa_nome && !map.has(item.empresa_id)) {
              map.set(item.empresa_id, { empresa_id: item.empresa_id, empresa_nome: item.empresa_nome });
              modified = true;
            }
            if (item.empresa_id && !fetchedIds.includes(item.empresa_id)) {
              fetchedIds.push(item.empresa_id);
            }
          });
          
          return modified ? Array.from(map.values()).sort((a,b) => a.empresa_id - b.empresa_id) : prev;
        });

        // Descobre SE havia IDs inteiramente inéditos (que não estao no allCompanies atual)
        const empresasConhecidasIds = JSON.parse(localStorage.getItem("movingpay_companies") || "[]").map(c => c.empresa_id);
        const empresasIneditas = fetchedIds.filter(id => !empresasConhecidasIds.includes(id));

        // Força a auto-seleção apenas em cenários cruciais
        setSelectedCompanies(prev => {
           // Se for o PRIMEIRO SESSÃO DO NAVEGADOR na vida -> carrega tudo.
           if (!localStorage.getItem("movingpay_first_load")) {
              localStorage.setItem("movingpay_first_load", "1");
              return [...new Set([...prev, ...fetchedIds])]; 
           }

           // Se descobriu uma firma nova globalmente que não existia nem desticada, a gente marca ela
           if (empresasIneditas.length > 0) {
              return [...new Set([...prev, ...empresasIneditas])];
           }

           // Mantem o filtro do usuario (mesmo que seja apenas 3 empresas!)
           return prev; 
        });

        return result;
      } else if (response.status === 401) {
        sessionStorage.removeItem("access_token");
        navigate("/login");
        return null;
      } else {
        console.error("Erro na API da Moving Pay", response.status);
        return [];
      }
    } catch (error) {
      console.error("Erro na request:", error);
      return [];
    }
  };

  // Main Effect
  useEffect(() => {
    const loadData = async () => {
      setLoadingMain(true);
      const mData = await fetchPeriodData(sessionPeriod);
      if (mData !== null) setMainData(mData);
      setLoadingMain(false);

      if (compareMode) {
        setLoadingCompare(true);
        const prevP = getPreviousMonth(sessionPeriod);
        const cData = await fetchPeriodData(prevP);
        if (cData !== null) setCompareData(cData);
        setLoadingCompare(false);
      }
    };
    loadData();
  }, [sessionPeriod, compareMode, navigate]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    if (inputPeriod && inputPeriod.match(/^\d{2}\/\d{4}$/)) {
      setSessionPeriod(inputPeriod);
    } else {
      alert("Por favor insira um período válido no formato MM/YYYY (Ex: 01/2026)");
    }
  };

  const handleCheckboxToggle = (id) => {
    setSelectedCompanies(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCompanies.length === allCompanies.length) {
      setSelectedCompanies([]); 
    } else {
      setSelectedCompanies(allCompanies.map(c => c.empresa_id));
    }
  };

  const handleExportCSV = () => {
    // 1. Filtrar e ordenar usando os mesmos critérios da tela
    const dataToExport = mainData
      .filter(item => selectedCompanies.includes(item.empresa_id))
      .sort((a, b) => (a.empresa_nome || "").localeCompare(b.empresa_nome || ""));

    if (dataToExport.length === 0) {
      alert("Não há dados para exportar com os filtros atuais.");
      return;
    }

    // 2. Definir os cabeçalhos exatamente como indicados
    const headers = ["Empresa", "N° de Clientes", "N° de Transações", "Valores"];
    
    // 3. Formatar as linhas seguindo as regras de exibição e valores
    const rows = dataToExport.map(item => {
      const clientes = item.total_clientes ?? 0;
      const transacoes = item.total_transacoes ?? 0;
      const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.valor_transacoes || 0) / 100);
      
      return [
        `"${item.empresa_nome || ''}"`,
        `"${clientes}"`,
        `"${transacoes}"`,
        `"${valor}"`
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `relatorio_${sessionPeriod.replace("/", "-")}.csv`);
  };

  const handleExportJSON = () => {
    const dataToExport = mainData
      .filter(item => selectedCompanies.includes(item.empresa_id))
      .sort((a, b) => (a.empresa_nome || "").localeCompare(b.empresa_nome || ""));

    if (dataToExport.length === 0) {
      alert("Não há dados para exportar com os filtros atuais.");
      return;
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    saveAs(blob, `relatorio_${sessionPeriod.replace("/", "-")}.json`);
  };

  const handleExportXLSX = async () => {
    const dataToExport = mainData
      .filter(item => selectedCompanies.includes(item.empresa_id))
      .sort((a, b) => (a.empresa_nome || "").localeCompare(b.empresa_nome || ""));

    if (dataToExport.length === 0) {
      alert("Não há dados para exportar com os filtros atuais.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Relatório Mensal");

    // Configurando larguras
    sheet.getColumn(1).width = 45; // Empresa
    sheet.getColumn(2).width = 20; // Clientes
    sheet.getColumn(3).width = 20; // Transações
    sheet.getColumn(4).width = 25; // Valores

    // Título Superior (Linha 1) - Mesclar de A1 até D1
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = "Movingpay";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF000000" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" } // Azul Claro Pastel
    };
    
    // Configurar Fonte Padrão para a planilha
    sheet.getColumn(1).font = { name: "Arial", size: 10 };
    sheet.getColumn(2).font = { name: "Arial", size: 10 };
    sheet.getColumn(3).font = { name: "Arial", size: 10 };
    sheet.getColumn(4).font = { name: "Arial", size: 10 };

    // Cabeçalhos (Linha 2)
    const headerRow = sheet.getRow(2);
    headerRow.values = ["Clientes", "Nº Cliente", "Transações", "Valores"];
    headerRow.font = { bold: true, color: { argb: "FF000000" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    
    // Verde Alface / Light Green no Cabeçalho
    for(let i = 1; i <= 4; i++) {
        const cell = headerRow.getCell(i);
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFA9D08E" } 
        };
        cell.border = {
            top: {style:'thin'}, left: {style:'thin'},
            bottom: {style:'thin'}, right: {style:'thin'}
        };
    }

    // Inserindo dados (a partir da linha 3)
    dataToExport.forEach((item, idx) => {
        const rowNum = 3 + idx;
        const row = sheet.getRow(rowNum);
        
        // Tratar "Zerado" vs Numérico
        const trClientes = (item.total_clientes === "Zerado") ? 0 : Number(item.total_clientes || 0);
        const trTransacoes = (item.total_transacoes === "Zerado") ? 0 : Number(item.total_transacoes || 0);
        const valor = Number(item.valor_transacoes || 0) / 100;
        
        row.values = [
            item.empresa_nome || "",
            trClientes,
            trTransacoes,
            valor
        ];

        // Zebra -> Ímpar fundo branco FF FFF FFF, Par fundo azul bem claro FF F0 F8 FF
        const isOddRow = (idx % 2 === 0); // index 0 é visualmente a primeira linha de dados
        const bgPattern = isOddRow ? "FFFFFFFF" : "FFF2F2F2"; // Cor Cinza bem clara para zebra inves de azul, pois combina mto

        for(let col = 1; col <= 4; col++) {
            const cell = row.getCell(col);
            
            // Bordas e Fundo
            cell.border = {
                top: {style:'thin'}, left: {style:'thin'},
                bottom: {style:'thin'}, right: {style:'thin'}
            };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: bgPattern }
            };

            // Alinhamentos
            if (col === 1) cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
            if (col === 2 || col === 3) cell.alignment = { horizontal: "center", vertical: "middle" };
            if (col === 4) {
               cell.alignment = { horizontal: "right", vertical: "middle" };
               // Cifrão com 2 dígitos
               cell.numFmt = '"R$" #,##0.00';
            }
        }
    });

    // Salvar arquivo usando FileSaver
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Relatorio_MovingPay_${sessionPeriod.replace("/", "-")}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center">
      {/* HEADER / TOOLBAR COM OS FILTROS */}
      <div className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 py-4 flex justify-between items-center relative">
          
          <div className="w-10"></div> {/* spacer */}

          {/* Form Filter */}
          <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center justify-center gap-3 w-full max-w-5xl">
            
            {/* Custom Dropdown: Empresas */}
            <div className="relative" ref={dropdownRef}>
              <Button 
                type="button" 
                variant="outline" 
                className="w-[280px] justify-between text-left font-normal bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="truncate">
                  {selectedCompanies.length === allCompanies.length && allCompanies.length > 0
                    ? "Todas Empresas Selecionadas"
                    : selectedCompanies.length === 0 
                      ? "Nenhuma Empresa Expirou/Salva" 
                      : `${selectedCompanies.length} selecionada(s)`}
                </span>
                <CaretDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>

              {dropdownOpen && (
                <div className="absolute top-full right-0 xl:right-auto mt-1 w-[340px] max-h-[28rem] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-md z-[100] flex flex-col">
                  
                  {/* Caixa de Pesquisa dentro do Dropdown */}
                  <div className="sticky top-0 bg-white dark:bg-zinc-900 z-10 px-2 pt-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <Input 
                      type="text" 
                      placeholder="Pesquisar por ID ou Empresa..." 
                      className="h-8 text-sm focus-visible:ring-1 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-100"
                      value={searchCompany}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter') e.preventDefault();
                      }}
                      onChange={(e) => setSearchCompany(e.target.value)}
                    />
                  </div>

                  {/* Wrapper para os itens que vão rolar embaixo */}
                  <div className="flex flex-col gap-1 p-2">
                    <div 
                      className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md cursor-pointer mb-1"
                      onClick={handleSelectAll}
                    >
                       <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedCompanies.length === allCompanies.length && allCompanies.length > 0 ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100' : 'border-zinc-300 dark:border-zinc-600'}`}>
                          {selectedCompanies.length === allCompanies.length && allCompanies.length > 0 && <Check weight="bold" className="text-white dark:text-zinc-900 w-3 h-3" />}
                       </div>
                       <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Selecionar Todas</span>
                    </div>
                    
                    {allCompanies.length === 0 && (
                      <div className="px-2 py-3 text-sm text-zinc-500 dark:text-zinc-400 text-center">Carregando repositório de clientes...</div>
                    )}

                    {filteredCompanies.length === 0 && allCompanies.length > 0 && (
                       <div className="px-2 py-5 text-sm text-zinc-400 dark:text-zinc-500 text-center italic">
                          Nenhuma empresa encontrada com "{searchCompany}"
                       </div>
                    )}

                    {filteredCompanies.map(emp => {
                      const isChecked = selectedCompanies.includes(emp.empresa_id);
                      return (
                        <div 
                          key={emp.empresa_id} 
                          className="flex items-center gap-3 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md cursor-pointer transition-colors"
                          onClick={() => handleCheckboxToggle(emp.empresa_id)}
                        >
                           <div className={`w-4 h-4 border rounded shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100' : 'border-zinc-300 dark:border-zinc-600'}`}>
                              {isChecked && <Check weight="bold" className="text-white dark:text-zinc-900 w-3 h-3" />}
                           </div>
                           <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{emp.empresa_id} - {emp.empresa_nome}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Input Período */}
            <div className="relative flex items-center">
              <CalendarBlank className="absolute left-3 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <Input 
                type="text" 
                placeholder="MM/YYYY" 
                className="pl-9 w-32 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:focus-visible:ring-zinc-600"
                value={inputPeriod}
                onChange={(e) => setInputPeriod(e.target.value)}
              />
            </div>
            
            <Button type="submit" variant="default" className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
              Filtrar Novo Período
            </Button>
            
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 mx-2 hidden lg:block"></div>

            <Button 
              type="button" 
              variant={compareMode ? "destructive" : "secondary"} 
              className={`flex gap-2 items-center ${compareMode ? '' : 'dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 border-transparent dark:border-zinc-700'}`}
              onClick={() => setCompareMode(!compareMode)}
            >
              <ArrowsLeftRight weight="bold" />
              {compareMode ? "Desativar Comparação" : "Comparar com mês anterior"}
            </Button>
          </form>
          
          <div className="justify-end flex items-center gap-3">
             <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mr-2 shadow-sm border border-zinc-200 dark:border-zinc-700">
               <span className="text-xs font-semibold px-2 flex items-center text-zinc-500 dark:text-zinc-400 cursor-default">Exportar:</span>
               <Button type="button" variant="ghost" size="sm" className="h-7 px-3 text-xs dark:text-zinc-100 dark:hover:bg-zinc-700 font-medium" onClick={handleExportXLSX}>
                 Excel (.xlsx)
               </Button>
               <Button type="button" variant="ghost" size="sm" className="h-7 px-3 text-xs dark:text-zinc-100 dark:hover:bg-zinc-700 font-medium" onClick={handleExportCSV}>
                 Planilha (.csv)
               </Button>
               <Button type="button" variant="ghost" size="sm" className="h-7 px-3 text-xs dark:text-zinc-100 dark:hover:bg-zinc-700 font-medium" onClick={handleExportJSON}>
                 JSON
               </Button>
             </div>
             <ThemeToggle />
          </div>

        </div>
      </div>

      {/* CONTEÚDO DA DASHBOARD (TABELAS) */}
      <div className="w-full max-w-[1920px] p-6 md:p-12 flex flex-col md:flex-row justify-center gap-8 items-start">
        
        {/* LADO ESQUERDO: MÊS COMPARATIVO RETROATIVO (-2) */}
        {compareMode && (
          <div className="w-full xl:w-1/2">
             <CompanyTable 
                title={`Período: ${getPreviousMonth(sessionPeriod)}`}
                data={compareData}
                otherData={mainData}
                compareMode={compareMode}
                loading={loadingCompare}
                selectedCompanies={selectedCompanies}
             />
          </div>
        )}

        {/* LADO DIREITO: MÊS PRINCIPAL DA BUSCA (-1 POR PADRÃO) */}
        <div className={`w-full ${compareMode ? 'xl:w-1/2' : 'max-w-[1400px]'}`}>
           <CompanyTable 
              title={`Período: ${sessionPeriod}`}
              data={mainData}
              otherData={compareData}
              compareMode={compareMode}
              loading={loadingMain}
              selectedCompanies={selectedCompanies}
           />
        </div>

      </div>
    </div>
  );
}
