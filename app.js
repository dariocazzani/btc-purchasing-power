const CHARTS = [
    {
        id: "chart-btc-usd",
        dataFile: "data/btc_usd.json",
        title: "USD in BTC",
        yLabel: "BTC per $1",
        valueKey: "btc_per_usd",
        showUsdPrice: false,
    },
    {
        id: "chart-gold",
        dataFile: "data/gold_usd.json",
        title: "Gold / BTC",
        yLabel: "Gold per BTC (oz)",
        valueKey: "asset_per_btc",
        showUsdPrice: true,
        usdLabel: "Gold (USD/oz)",
    },
    {
        id: "chart-sp500",
        dataFile: "data/sp500.json",
        title: "S&P 500 / BTC",
        yLabel: "S&P 500 per BTC",
        valueKey: "asset_per_btc",
        showUsdPrice: true,
        usdLabel: "S&P 500 (USD)",
    },
    {
        id: "chart-housing-us",
        dataFile: "data/housing_us_median.json",
        title: "US Median House / BTC",
        yLabel: "Houses per BTC",
        valueKey: "asset_per_btc",
        showUsdPrice: true,
        usdLabel: "House (USD)",
    },
    {
        id: "chart-housing-northeast",
        dataFile: "data/housing_northeast.json",
        title: "Northeast House / BTC",
        yLabel: "Houses per BTC",
        valueKey: "asset_per_btc",
        showUsdPrice: true,
        usdLabel: "House (USD)",
    },
    {
        id: "chart-housing-midwest",
        dataFile: "data/housing_midwest.json",
        title: "Midwest House / BTC",
        yLabel: "Houses per BTC",
        valueKey: "asset_per_btc",
        showUsdPrice: true,
        usdLabel: "House (USD)",
    },
    {
        id: "chart-housing-south",
        dataFile: "data/housing_south.json",
        title: "South House / BTC",
        yLabel: "Houses per BTC",
        valueKey: "asset_per_btc",
        showUsdPrice: true,
        usdLabel: "House (USD)",
    },
    {
        id: "chart-housing-west",
        dataFile: "data/housing_west.json",
        title: "West House / BTC",
        yLabel: "Houses per BTC",
        valueKey: "asset_per_btc",
        showUsdPrice: true,
        usdLabel: "House (USD)",
    },
];

let useLogScale = true;
let loadedData = {};

function isMobile() {
    return window.innerWidth < 768;
}

async function fetchData(dataFile) {
    try {
        const response = await fetch(dataFile);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to load ${dataFile}:`, error);
        return null;
    }
}

function createChart(chartConfig, data) {
    const container = document.getElementById(chartConfig.id);

    if (!data || !data.data || data.data.length === 0) {
        container.innerHTML = `<p class="no-data">No data available for ${chartConfig.title}</p>`;
        return;
    }

    const dates = data.data.map((d) => d.date);
    const values = data.data.map((d) => d[chartConfig.valueKey]);
    const mobile = isMobile();

    const traces = [];

    // Primary trace: asset priced in BTC
    traces.push({
        x: dates,
        y: values,
        type: "scatter",
        mode: "lines",
        name: mobile ? "BTC" : chartConfig.yLabel,
        line: {
            color: "#f7931a",
            width: 2,
        },
        hovertemplate: "%{y:,.6f}<extra></extra>",
    });

    // Secondary trace: USD price (if enabled)
    if (chartConfig.showUsdPrice) {
        const usdValues = data.data.map((d) => d.asset_price);
        traces.push({
            x: dates,
            y: usdValues,
            type: "scatter",
            mode: "lines",
            name: mobile ? "USD" : chartConfig.usdLabel,
            yaxis: "y2",
            line: {
                color: "#4a90d9",
                width: 2,
                dash: "dot",
            },
            hovertemplate: "$%{y:,.2f}<extra></extra>",
        });
    }

    const layout = {
        title: {
            text: chartConfig.title,
            font: { size: mobile ? 16 : 18 },
        },
        xaxis: {
            title: mobile ? "" : "Date",
            gridcolor: "#e0e0e0",
        },
        yaxis: {
            title: mobile ? "" : chartConfig.yLabel,
            titlefont: { color: "#f7931a" },
            tickfont: { color: "#f7931a", size: mobile ? 10 : 12 },
            type: useLogScale ? "log" : "linear",
            gridcolor: "#e0e0e0",
        },
        paper_bgcolor: "#fafafa",
        plot_bgcolor: "#fafafa",
        margin: {
            t: mobile ? 40 : 50,
            r: chartConfig.showUsdPrice ? (mobile ? 40 : 80) : 30,
            b: mobile ? 30 : 50,
            l: mobile ? 40 : 70,
        },
        hovermode: "x unified",
        legend: {
            x: 1,
            xanchor: "right",
            y: 1,
            yanchor: "top",
            bgcolor: "rgba(255,255,255,0.8)",
            bordercolor: "#e0e0e0",
            borderwidth: 1,
            font: { size: mobile ? 10 : 12 },
        },
        showlegend: chartConfig.showUsdPrice,
    };

    // Add secondary y-axis if showing USD price
    if (chartConfig.showUsdPrice) {
        layout.yaxis2 = {
            title: mobile ? "" : chartConfig.usdLabel,
            titlefont: { color: "#4a90d9" },
            tickfont: { color: "#4a90d9", size: mobile ? 10 : 12 },
            overlaying: "y",
            side: "right",
            type: useLogScale ? "log" : "linear",
            showgrid: false,
        };
    }

    const config = {
        responsive: true,
        displayModeBar: !mobile,
        modeBarButtonsToRemove: ["lasso2d", "select2d"],
    };

    Plotly.newPlot(container, traces, layout, config);
}

function updateAllCharts() {
    for (const chartConfig of CHARTS) {
        const data = loadedData[chartConfig.dataFile];
        if (data) {
            createChart(chartConfig, data);
        }
    }
}

function updateLastUpdated() {
    let latestDate = null;

    for (const data of Object.values(loadedData)) {
        if (data && data.updated_at) {
            const date = new Date(data.updated_at);
            if (!latestDate || date > latestDate) {
                latestDate = date;
            }
        }
    }

    const element = document.getElementById("last-updated");
    if (latestDate) {
        element.textContent = latestDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }
}

async function init() {
    // Load all data
    const loadPromises = CHARTS.map(async (chartConfig) => {
        const data = await fetchData(chartConfig.dataFile);
        loadedData[chartConfig.dataFile] = data;
        createChart(chartConfig, data);
    });

    await Promise.all(loadPromises);
    updateLastUpdated();

    // Set up log scale toggle
    const logScaleCheckbox = document.getElementById("log-scale");
    logScaleCheckbox.addEventListener("change", (e) => {
        useLogScale = e.target.checked;
        updateAllCharts();
    });

    // Redraw on resize (handles orientation change)
    window.addEventListener("resize", updateAllCharts);
}

document.addEventListener("DOMContentLoaded", init);