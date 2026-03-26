import { Chart } from 'chart.js/auto';
import { createCanvas } from 'canvas';

/**
 * Generar un gráfico usando Chart.js y convertirlo a base64
 * @param {Object} chartConfig - Configuración del gráfico
 * @returns {Promise<string>} - Imagen en formato base64
 */
export const generateChart = async (chartConfig) => {
  try {
    const { type, labels, datasets, title, options = {} } = chartConfig;

    // Validar configuración
    if (!type || !labels || !datasets) {
      throw new Error('Configuración de gráfico incompleta');
    }

    // Crear canvas (tamaño más compacto)
    const width = 600;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Configuración del gráfico
    const config = {
      type,
      data: {
        labels,
        datasets: datasets.map(dataset => ({
          label: dataset.label || 'Datos',
          data: dataset.data,
          backgroundColor: dataset.backgroundColor || generateColors(dataset.data.length, 0.6),
          borderColor: dataset.borderColor || generateColors(dataset.data.length, 1),
          borderWidth: dataset.borderWidth || 2,
          fill: dataset.fill !== undefined ? dataset.fill : false,
        }))
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 14
              },
              padding: 15
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 13
            },
            padding: 12
          }
        },
        scales: type !== 'pie' && type !== 'doughnut' && type !== 'radar' ? {
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            ticks: {
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        } : {},
        ...options
      },
      plugins: [{
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart) => {
          const ctx = chart.canvas.getContext('2d');
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, chart.width, chart.height);
          ctx.restore();
        }
      }]
    };

    // Crear gráfico
    new Chart(ctx, config);

    // Convertir a base64
    const buffer = canvas.toBuffer('image/png');
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

    return base64;
  } catch (error) {
    console.error('Error al generar gráfico:', error);
    throw new Error(`Error al generar gráfico: ${error.message}`);
  }
};

/**
 * Generar colores para los datos del gráfico
 * @param {number} count - Número de colores a generar
 * @param {number} alpha - Transparencia (0-1)
 * @returns {string[]} - Array de colores en formato rgba
 */
const generateColors = (count, alpha = 1) => {
  const baseColors = [
    [54, 162, 235],   // Azul
    [255, 99, 132],   // Rojo
    [75, 192, 192],   // Verde azulado
    [255, 206, 86],   // Amarillo
    [153, 102, 255],  // Púrpura
    [255, 159, 64],   // Naranja
    [201, 203, 207],  // Gris
    [83, 211, 87],    // Verde
    [237, 100, 166],  // Rosa
    [126, 176, 213],  // Azul claro
  ];

  const colors = [];
  for (let i = 0; i < count; i++) {
    const color = baseColors[i % baseColors.length];
    colors.push(`rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
  }
  return colors;
};

/**
 * Regenerar un gráfico con variaciones en los datos
 * @param {Object} originalConfig - Configuración original del gráfico
 * @returns {Promise<string>} - Nueva imagen en formato base64
 */
export const regenerateChart = async (originalConfig) => {
  try {
    // Clonar configuración
    const newConfig = JSON.parse(JSON.stringify(originalConfig));

    // Variar los datos ligeramente (±20%)
    newConfig.datasets = newConfig.datasets.map(dataset => ({
      ...dataset,
      data: dataset.data.map(value => {
        const variation = value * 0.2;
        const newValue = value + (Math.random() * variation * 2 - variation);
        return Math.max(0, Math.round(newValue * 10) / 10);
      })
    }));

    // Generar nuevo gráfico
    return await generateChart(newConfig);
  } catch (error) {
    console.error('Error al regenerar gráfico:', error);
    throw new Error(`Error al regenerar gráfico: ${error.message}`);
  }
};

/**
 * Generar datos aleatorios para un gráfico
 * @param {number} count - Número de datos
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number[]} - Array de datos aleatorios
 */
export const generateRandomData = (count, min = 0, max = 100) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return data;
};

/**
 * Validar configuración de gráfico
 * @param {Object} chartConfig - Configuración a validar
 * @returns {boolean} - true si es válida
 */
export const validateChartConfig = (chartConfig) => {
  const validTypes = ['bar', 'line', 'pie', 'doughnut', 'radar', 'scatter', 'polarArea'];
  
  if (!chartConfig.type || !validTypes.includes(chartConfig.type)) {
    return false;
  }
  
  if (!chartConfig.labels || !Array.isArray(chartConfig.labels)) {
    return false;
  }
  
  if (!chartConfig.datasets || !Array.isArray(chartConfig.datasets)) {
    return false;
  }
  
  for (const dataset of chartConfig.datasets) {
    if (!dataset.data || !Array.isArray(dataset.data)) {
      return false;
    }
    if (dataset.data.length !== chartConfig.labels.length) {
      return false;
    }
  }
  
  return true;
};
