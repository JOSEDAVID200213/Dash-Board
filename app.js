// Global State Variables
let rawSalesSummary = [];
let rawSalesMonthly = [];
let rawSalesProducts = [];
let rawCatalogStats = null;
let rawCatalogSample = [];

// Filter States
let salesFilters = {
  month: 'ALL',
  brand: 'ALL',
  gender: 'ALL'
};

let catalogFilters = {
  brand: 'ALL',
  dept: 'ALL',
  active: 'ALL',
  search: ''
};

// Pagination State
let catalogPagination = {
  currentPage: 1,
  pageSize: 10
};

// Chart.js Instances
let trendChartInstance = null;
let genderChartInstance = null;
let brandChartInstance = null;
let catDeptChartInstance = null;
let catCategoryChartInstance = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initializeUI();
  updateSalesView();
  updateCatalogView();
  lucide.createIcons();
});

// Load JSON datasets
async function loadData() {
  try {
    const summaryRes = await fetch('src/data/sales_summary.json');
    rawSalesSummary = await summaryRes.json();

    const monthlyRes = await fetch('src/data/sales_monthly.json');
    rawSalesMonthly = await monthlyRes.json();

    const productsRes = await fetch('src/data/sales_products.json');
    rawSalesProducts = await productsRes.json();

    const statsRes = await fetch('src/data/catalog_stats.json');
    rawCatalogStats = await statsRes.json();

    const sampleRes = await fetch('src/data/catalog_sample.json');
    rawCatalogSample = await sampleRes.json();
  } catch (error) {
    console.error("Error loading JSON datasets:", error);
  }
}

// Set up UI controls
function initializeUI() {
  // Tab Switching
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const filterSectionSales = document.getElementById('salesFilters');
  const filterSectionCatalog = document.getElementById('catalogFilters');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      navButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(t => t.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
      
      if (tabId === 'tab-sales') {
        pageTitle.innerText = "Ventas E-Commerce";
        pageSubtitle.innerText = "Análisis mensual de ventas, presupuestos y EBITDA de la tienda online.";
        filterSectionSales.classList.remove('hidden');
        filterSectionCatalog.classList.add('hidden');
      } else {
        pageTitle.innerText = "Catálogo de Productos";
        pageSubtitle.innerText = "Métricas agregadas y visualización del catálogo maestro Arturo Calle.";
        filterSectionSales.classList.add('hidden');
        filterSectionCatalog.classList.remove('hidden');
      }
    });
  });

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme');
    updateSalesCharts();
    updateCatalogCharts();
  });

  // Populate Sales Filter Dropdowns
  const filterMonth = document.getElementById('filterMonth');
  const filterBrand = document.getElementById('filterBrand');
  const filterGender = document.getElementById('filterGender');

  const salesBrands = [...new Set(rawSalesProducts.map(p => p.Marca).filter(Boolean))].sort();
  salesBrands.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.innerText = b.replace('Producto ', '');
    filterBrand.appendChild(opt);
  });

  const salesGenders = [...new Set(rawSalesProducts.map(p => p.Genero).filter(Boolean))].sort();
  salesGenders.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.innerText = g;
    filterGender.appendChild(opt);
  });

  // Filter Listeners
  filterMonth.addEventListener('change', (e) => {
    salesFilters.month = e.target.value;
    updateSalesView();
  });
  filterBrand.addEventListener('change', (e) => {
    salesFilters.brand = e.target.value;
    updateSalesView();
  });
  filterGender.addEventListener('change', (e) => {
    salesFilters.gender = e.target.value;
    updateSalesView();
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    filterMonth.value = 'ALL';
    filterBrand.value = 'ALL';
    filterGender.value = 'ALL';
    salesFilters = { month: 'ALL', brand: 'ALL', gender: 'ALL' };
    updateSalesView();
  });

  // Populate Catalog Filters
  const catFilterBrand = document.getElementById('catFilterBrand');
  const catFilterDept = document.getElementById('catFilterDept');
  const catFilterActive = document.getElementById('catFilterActive');
  const catalogSearchInput = document.getElementById('catalogSearchInput');

  if (rawCatalogStats) {
    Object.keys(rawCatalogStats.brand_counts).sort().forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.innerText = b;
      catFilterBrand.appendChild(opt);
    });

    Object.keys(rawCatalogStats.dept_counts).sort().forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.innerText = d;
      catFilterDept.appendChild(opt);
    });
  }

  catFilterBrand.addEventListener('change', (e) => {
    catalogFilters.brand = e.target.value;
    catalogPagination.currentPage = 1;
    updateCatalogTable();
  });
  catFilterDept.addEventListener('change', (e) => {
    catalogFilters.dept = e.target.value;
    catalogPagination.currentPage = 1;
    updateCatalogTable();
  });
  catFilterActive.addEventListener('change', (e) => {
    catalogFilters.active = e.target.value;
    catalogPagination.currentPage = 1;
    updateCatalogTable();
  });
  catalogSearchInput.addEventListener('input', (e) => {
    catalogFilters.search = e.target.value.toLowerCase();
    catalogPagination.currentPage = 1;
    updateCatalogTable();
  });

  document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (catalogPagination.currentPage > 1) {
      catalogPagination.currentPage--;
      updateCatalogTable();
    }
  });
  document.getElementById('nextPageBtn').addEventListener('click', () => {
    catalogPagination.currentPage++;
    updateCatalogTable();
  });
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "$0";
  if (Math.abs(value) >= 1000000) {
    return '$' + (value / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';
  }
  return '$' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function formatNumber(value) {
  if (value === null || value === undefined) return "0";
  return value.toLocaleString('es-CO');
}

// Update Sales View Details
function updateSalesView() {
  updateSalesKPIs();
  updateSalesCharts();
  updateSalesProductTable();
  updateExecutiveInsights();
}

function updateExecutiveInsights() {
  let filteredProds = rawSalesProducts;
  if (salesFilters.month !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Mes === salesFilters.month);
  }
  if (salesFilters.brand !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Marca === salesFilters.brand);
  }
  if (salesFilters.gender !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Genero === salesFilters.gender);
  }

  const totalActualSales = filteredProds.reduce((sum, p) => sum + (p.PesosActuales || 0), 0);
  const totalPrevSales = filteredProds.reduce((sum, p) => sum + (p.PesosAnteriores || 0), 0);
  const totalBudgetPesos = filteredProds.reduce((sum, p) => sum + (p.PresupuestoPesos || 0), 0);

  let filteredTienda = rawSalesSummary;
  if (salesFilters.month !== 'ALL') {
    filteredTienda = filteredTienda.filter(t => t.MES === salesFilters.month);
  }
  const totalEbitda = filteredTienda.reduce((sum, t) => sum + (t.UtilidadEBITDA || 0), 0);
  const totalRealRevenue = filteredTienda.reduce((sum, t) => sum + (t.IngresosReales || 0), 0);

  // 1. Sales Performance Insight
  let salesInsight = "";
  if (totalActualSales > 0) {
    const changePct = totalPrevSales > 0 ? ((totalActualSales - totalPrevSales) / totalPrevSales * 100) : 0;
    const changeDirection = changePct >= 0 ? "un incremento" : "una disminución";
    salesInsight = `Las ventas acumuladas del canal online ascienden a <strong>${formatCurrency(totalActualSales)}</strong>, reflejando <strong>${changeDirection} del ${Math.abs(changePct).toFixed(1)}%</strong> frente al año anterior (donde se registraron ${formatCurrency(totalPrevSales)}).`;
  } else {
    salesInsight = "No hay registros de ventas para la combinación de filtros seleccionada.";
  }
  document.getElementById('insightSalesPerformance').innerHTML = salesInsight;

  // 2. Brand Participation Insight
  let brandInsight = "";
  const brandAgg = {};
  filteredProds.forEach(p => {
    const b = (p.Marca || 'Desconocido').replace('Producto ', '');
    brandAgg[b] = (brandAgg[b] || 0) + (p.PesosActuales || 0);
  });

  const sortedBrands = Object.entries(brandAgg).sort((a, b) => b[1] - a[1]);
  if (sortedBrands.length > 0 && totalActualSales > 0) {
    const topBrand = sortedBrands[0][0];
    const topBrandPct = (sortedBrands[0][1] / totalActualSales) * 100;
    brandInsight = `La marca con mayor facturación en la tienda online es <strong>${topBrand}</strong>, liderando la participación con un <strong>${topBrandPct.toFixed(1)}%</strong> de la facturación total, seguida por las demás líneas comerciales.`;
  } else {
    brandInsight = "Sin datos suficientes para calcular la participación de marcas.";
  }
  document.getElementById('insightBrandParticipation').innerHTML = brandInsight;

  // 3. Efficiency / EBITDA Insight
  let efficiencyInsight = "";
  const budgetPct = totalBudgetPesos > 0 ? (totalActualSales / totalBudgetPesos * 100) : 0;
  const ebitdaMargin = totalRealRevenue > 0 ? (totalEbitda / totalRealRevenue * 100) : 0;
  
  if (totalActualSales > 0) {
    const budgetStatus = budgetPct >= 100 ? "superando la meta" : "por debajo de la meta";
    const ebitdaStatus = totalEbitda >= 0 ? "favorable" : "deficitaria";
    efficiencyInsight = `Se ha alcanzado un <strong>${budgetPct.toFixed(1)}%</strong> del presupuesto comercial. El margen EBITDA operativo es del <strong>${ebitdaMargin.toFixed(1)}%</strong> (${formatCurrency(totalEbitda)}), denotando una operación <strong>${ebitdaStatus}</strong>.`;
  } else {
    efficiencyInsight = "Sin datos de presupuesto disponibles para el periodo actual.";
  }
  document.getElementById('insightEfficiency').innerHTML = efficiencyInsight;
}

function updateSalesKPIs() {
  let filteredProds = rawSalesProducts;
  if (salesFilters.month !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Mes === salesFilters.month);
  }
  if (salesFilters.brand !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Marca === salesFilters.brand);
  }
  if (salesFilters.gender !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Genero === salesFilters.gender);
  }

  // Use Cleaned spaceless properties
  const totalActualSales = filteredProds.reduce((sum, p) => sum + (p.PesosActuales || 0), 0);
  const totalPrevSales = filteredProds.reduce((sum, p) => sum + (p.PesosAnteriores || 0), 0);
  const totalActualUnits = filteredProds.reduce((sum, p) => sum + (p.UnidadesActuales || 0), 0);
  const totalPrevUnits = filteredProds.reduce((sum, p) => sum + (p.UnidadesAnteriores || 0), 0);
  const totalBudgetPesos = filteredProds.reduce((sum, p) => sum + (p.PresupuestoPesos || 0), 0);

  let filteredTienda = rawSalesSummary;
  if (salesFilters.month !== 'ALL') {
    filteredTienda = filteredTienda.filter(t => t.MES === salesFilters.month);
  }
  
  const totalEbitda = filteredTienda.reduce((sum, t) => sum + (t.UtilidadEBITDA || 0), 0);
  const totalRealRevenue = filteredTienda.reduce((sum, t) => sum + (t.IngresosReales || 0), 0);

  document.getElementById('kpiSalesVal').innerText = formatCurrency(totalActualSales);
  document.getElementById('kpiUnitsVal').innerText = formatNumber(totalActualUnits);
  
  // Sales trend badge
  const salesTrendEl = document.getElementById('kpiSalesTrend');
  if (totalPrevSales > 0) {
    const pct = ((totalActualSales - totalPrevSales) / totalPrevSales) * 100;
    salesTrendEl.innerText = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    salesTrendEl.className = `kpi-badge ${pct >= 0 ? 'positive' : 'negative'}`;
  } else {
    salesTrendEl.innerText = '0.0%';
    salesTrendEl.className = 'kpi-badge neutral';
  }

  // Units trend badge
  const unitsTrendEl = document.getElementById('kpiUnitsTrend');
  if (totalPrevUnits > 0) {
    const pct = ((totalActualUnits - totalPrevUnits) / totalPrevUnits) * 100;
    unitsTrendEl.innerText = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    unitsTrendEl.className = `kpi-badge ${pct >= 0 ? 'positive' : 'negative'}`;
  } else {
    unitsTrendEl.innerText = '0.0%';
    unitsTrendEl.className = 'kpi-badge neutral';
  }

  // Budget
  const budgetAchValEl = document.getElementById('kpiBudgetVal');
  const budgetAchBarEl = document.getElementById('kpiBudgetBar');
  const budgetAchTextEl = document.getElementById('kpiBudgetText');
  
  if (totalBudgetPesos > 0) {
    const pct = (totalActualSales / totalBudgetPesos) * 100;
    budgetAchValEl.innerText = pct.toFixed(1) + '%';
    budgetAchBarEl.style.width = `${Math.min(pct, 100)}%`;
    budgetAchTextEl.innerText = `Presupuesto: ${formatCurrency(totalBudgetPesos)}`;
  } else {
    budgetAchValEl.innerText = '0%';
    budgetAchBarEl.style.width = '0%';
    budgetAchTextEl.innerText = 'Presupuesto: $0';
  }

  // EBITDA
  const ebitdaValEl = document.getElementById('kpiEbitdaVal');
  const ebitdaMarginEl = document.getElementById('kpiEbitdaMargin');
  
  ebitdaValEl.innerText = formatCurrency(totalEbitda);
  if (totalRealRevenue > 0) {
    const margin = (totalEbitda / totalRealRevenue) * 100;
    ebitdaMarginEl.innerText = margin.toFixed(1) + '%';
    ebitdaMarginEl.className = `kpi-badge ${margin >= 0 ? 'positive' : 'negative'}`;
  } else {
    ebitdaMarginEl.innerText = '0%';
    ebitdaMarginEl.className = 'kpi-badge neutral';
  }
}

function updateSalesCharts() {
  const isLight = document.body.classList.contains('light-theme');
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.1)';

  // 1. TREND CHART (uses Cleaned column names Vta2026, Vta2025, Vta2024)
  const ctxTrend = document.getElementById('monthlyTrendChart').getContext('2d');
  if (trendChartInstance) trendChartInstance.destroy();
  
  const monthsLabels = rawSalesMonthly.map(x => x.MES);
  const vta2026 = rawSalesMonthly.map(x => x.Vta2026);
  const vta2025 = rawSalesMonthly.map(x => x.Vta2025);
  const vta2024 = rawSalesMonthly.map(x => x.Vta2024);
  
  trendChartInstance = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: monthsLabels,
      datasets: [
        {
          label: 'Ventas 2026 (M)',
          data: vta2026,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 3,
          spanGaps: true
        },
        {
          label: 'Ventas 2025 (M)',
          data: vta2025,
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          borderDash: [5, 5]
        },
        {
          label: 'Ventas 2024 (M)',
          data: vta2024,
          borderColor: '#8b5cf6',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          borderDash: [2, 2]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Inter' } } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });

  // Filtered dataset
  let filteredProds = rawSalesProducts;
  if (salesFilters.month !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Mes === salesFilters.month);
  }
  if (salesFilters.brand !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Marca === salesFilters.brand);
  }
  if (salesFilters.gender !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Genero === salesFilters.gender);
  }

  // 2. GENDER DONUT CHART
  const ctxGender = document.getElementById('genderSalesChart').getContext('2d');
  if (genderChartInstance) genderChartInstance.destroy();
  
  const genderAgg = {};
  filteredProds.forEach(p => {
    const g = p.Genero || 'Desconocido';
    genderAgg[g] = (genderAgg[g] || 0) + (p.UnidadesActuales || 0);
  });
  
  genderChartInstance = new Chart(ctxGender, {
    type: 'doughnut',
    data: {
      labels: Object.keys(genderAgg),
      datasets: [{
        data: Object.values(genderAgg),
        backgroundColor: ['#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor } }
      },
      cutout: '65%'
    }
  });

  // 3. BRAND BAR CHART
  const ctxBrand = document.getElementById('brandSalesChart').getContext('2d');
  if (brandChartInstance) brandChartInstance.destroy();
  
  const brandAgg = {};
  filteredProds.forEach(p => {
    const b = (p.Marca || 'Desconocido').replace('Producto ', '');
    if (!brandAgg[b]) {
      brandAgg[b] = { sales: 0, budget: 0 };
    }
    brandAgg[b].sales += (p.PesosActuales || 0);
    brandAgg[b].budget += (p.PresupuestoPesos || 0);
  });

  const brands = Object.keys(brandAgg);
  const brandSales = brands.map(b => brandAgg[b].sales);
  const brandBudget = brands.map(b => brandAgg[b].budget);

  brandChartInstance = new Chart(ctxBrand, {
    type: 'bar',
    data: {
      labels: brands,
      datasets: [
        {
          label: 'Ventas Reales',
          data: brandSales,
          backgroundColor: '#3b82f6',
          borderRadius: 6
        },
        {
          label: 'Presupuesto',
          data: brandBudget,
          backgroundColor: '#64748b',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });
}

function updateSalesProductTable() {
  const tableBody = document.querySelector('#productSalesTable tbody');
  tableBody.innerHTML = '';

  let filteredProds = rawSalesProducts;
  if (salesFilters.month !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Mes === salesFilters.month);
  }
  if (salesFilters.brand !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Marca === salesFilters.brand);
  }
  if (salesFilters.gender !== 'ALL') {
    filteredProds = filteredProds.filter(p => p.Genero === salesFilters.gender);
  }

  const prodLineAgg = {};
  filteredProds.forEach(p => {
    const key = `${p.Producto}-${p.Marca}-${p.Genero}`;
    if (!prodLineAgg[key]) {
      prodLineAgg[key] = {
        name: p.Producto,
        brand: p.Marca.replace('Producto ', ''),
        gender: p.Genero,
        unitsAct: 0,
        salesAct: 0,
        unitsAnt: 0,
        budgetPesos: 0
      };
    }
    prodLineAgg[key].unitsAct += (p.UnidadesActuales || 0);
    prodLineAgg[key].salesAct += (p.PesosActuales || 0);
    prodLineAgg[key].unitsAnt += (p.UnidadesAnteriores || 0);
    prodLineAgg[key].budgetPesos += (p.PresupuestoPesos || 0);
  });

  const sortedLines = Object.values(prodLineAgg).sort((a, b) => b.salesAct - a.salesAct);

  sortedLines.slice(0, 15).forEach(line => {
    const row = document.createElement('tr');
    
    const budgetAch = line.budgetPesos > 0 ? ((line.salesAct / line.budgetPesos) * 100) : 0;
    let budgetClass = 'neutral';
    if (budgetAch >= 100) budgetClass = 'positive';
    else if (budgetAch < 75 && budgetAch > 0) budgetClass = 'negative';

    row.innerHTML = `
      <td>${line.name}</td>
      <td>${line.brand}</td>
      <td>${line.gender}</td>
      <td class="text-right">${formatNumber(line.unitsAct)}</td>
      <td class="text-right">${formatCurrency(line.salesAct)}</td>
      <td class="text-right">${formatNumber(line.unitsAnt)}</td>
      <td class="text-right">
        <span class="badge-status ${budgetClass}">
          ${budgetAch > 0 ? budgetAch.toFixed(0) + '%' : 'N/A'}
        </span>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// Update Catalog View Details
function updateCatalogView() {
  if (!rawCatalogStats) return;

  document.getElementById('catTotalVal').innerText = formatNumber(rawCatalogStats.total_products);
  
  const activeCount = rawCatalogStats.active_counts['Yes'] || 0;
  const activePct = (activeCount / rawCatalogStats.total_products) * 100;
  document.getElementById('catActiveVal').innerText = formatNumber(activeCount);
  document.getElementById('catActivePct').innerText = activePct.toFixed(1) + '%';

  const phys = rawCatalogStats.physical_stats;
  const avgWeight = phys.avg_actual_weight || phys.avg_package_weight || 0.0;
  document.getElementById('catAvgWeight').innerText = avgWeight.toFixed(2) + ' kg';
  document.getElementById('catAvgVol').innerText = `Dimensiones: ${(phys.avg_package_length || 0).toFixed(0)}x${(phys.avg_package_width || 0).toFixed(0)}x${(phys.avg_package_height || 0).toFixed(0)} cm`;

  const seo = rawCatalogStats.seo_stats;
  const seoPct = seo.total > 0 ? (seo.has_meta_desc / seo.total) * 100 : 0.0;
  document.getElementById('catSeoVal').innerText = seoPct.toFixed(1) + '%';

  updateCatalogCharts();
  updateCatalogTable();
}

function updateCatalogCharts() {
  if (!rawCatalogStats) return;
  
  const isLight = document.body.classList.contains('light-theme');
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.1)';

  // 1. Department
  const ctxDept = document.getElementById('catDeptChart').getContext('2d');
  if (catDeptChartInstance) catDeptChartInstance.destroy();
  
  const deptData = rawCatalogStats.dept_counts;
  
  catDeptChartInstance = new Chart(ctxDept, {
    type: 'bar',
    data: {
      labels: Object.keys(deptData),
      datasets: [{
        label: 'Número de Productos',
        data: Object.values(deptData),
        backgroundColor: '#8b5cf6',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { display: false }, ticks: { color: textColor } }
      }
    }
  });

  // 2. Category Top 10
  const ctxCat = document.getElementById('catCategoryChart').getContext('2d');
  if (catCategoryChartInstance) catCategoryChartInstance.destroy();
  
  const sortedCats = Object.entries(rawCatalogStats.category_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  catCategoryChartInstance = new Chart(ctxCat, {
    type: 'bar',
    data: {
      labels: sortedCats.map(c => c[0]),
      datasets: [{
        label: 'Cantidad SKUs',
        data: sortedCats.map(c => c[1]),
        backgroundColor: '#10b981',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, maxRotation: 45, minRotation: 45 } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });
}

function updateCatalogTable() {
  const tableBody = document.querySelector('#catalogTable tbody');
  tableBody.innerHTML = '';

  let filtered = rawCatalogSample;

  if (catalogFilters.brand !== 'ALL') {
    filtered = filtered.filter(p => p.Brand === catalogFilters.brand);
  }
  if (catalogFilters.dept !== 'ALL') {
    filtered = filtered.filter(p => p.Department === catalogFilters.dept);
  }
  if (catalogFilters.active !== 'ALL') {
    filtered = filtered.filter(p => p.Activeproduct === catalogFilters.active);
  }
  if (catalogFilters.search) {
    const s = catalogFilters.search;
    filtered = filtered.filter(p => 
      String(p.ProductID).includes(s) || 
      String(p.ProductName).toLowerCase().includes(s) || 
      String(p.Brand).toLowerCase().includes(s) || 
      String(p.Category).toLowerCase().includes(s)
    );
  }

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / catalogPagination.pageSize);
  
  if (catalogPagination.currentPage > totalPages) {
    catalogPagination.currentPage = Math.max(1, totalPages);
  }
  
  const startIdx = (catalogPagination.currentPage - 1) * catalogPagination.pageSize;
  const endIdx = Math.min(startIdx + catalogPagination.pageSize, totalItems);

  const pageSlice = filtered.slice(startIdx, endIdx);

  if (pageSlice.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-secondary" style="text-align: center; padding: 40px 0;">No se encontraron productos con los filtros seleccionados.</td></tr>`;
  } else {
    pageSlice.forEach(prod => {
      const row = document.createElement('tr');
      const activeClass = prod.Activeproduct === 'Yes' ? 'active' : 'inactive';
      const activeLabel = prod.Activeproduct === 'Yes' ? 'Activo' : 'Inactivo';

      row.innerHTML = `
        <td class="product-id-link">${prod.ProductID}</td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${prod.ProductName}">${prod.ProductName}</td>
        <td>${prod.Brand}</td>
        <td>${prod.Department}</td>
        <td>${prod.Category}</td>
        <td style="font-family: monospace;">${prod.SKUID || 'N/A'}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${prod.SKUname}">${prod.SKUname || 'N/A'}</td>
        <td>
          ${prod.ProductURL ? `
            <a href="${prod.ProductURL}" target="_blank" class="btn-action" title="Ver en Tienda">
              <i data-lucide="external-link"></i>
            </a>
          ` : '<span class="text-secondary">—</span>'}
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  document.getElementById('paginationInfo').innerText = totalItems > 0 
    ? `Mostrando ${startIdx + 1}-${endIdx} de ${formatNumber(totalItems)} productos` 
    : 'Mostrando 0-0 de 0 productos';

  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  prevBtn.disabled = catalogPagination.currentPage <= 1;
  nextBtn.disabled = catalogPagination.currentPage >= totalPages;

  lucide.createIcons();
}
