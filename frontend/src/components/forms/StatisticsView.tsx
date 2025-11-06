import { useState, useEffect, useRef } from 'react';
import { analyticsService, type FormStatistics, type QuestionStatistics } from '../../lib/analyticsService';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Registrar el plugin
Chart.register(ChartDataLabels);

interface StatisticsViewProps {
  formId: string;
}

export default function StatisticsView({ formId }: StatisticsViewProps) {
  const [statistics, setStatistics] = useState<FormStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Referencias para los gráficos
  const chartRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const chartInstances = useRef<{ [key: string]: Chart<any, any, any> | null }>({});
  
  // Función para asignar referencias a los canvas
  const setChartRef = (id: string, element: HTMLCanvasElement | null) => {
    chartRefs.current[id] = element;
  };

  useEffect(() => {
    if (formId) {
      loadStatistics();
    }
    
    // Limpieza de gráficos al desmontar
    return () => {
      Object.values(chartInstances.current).forEach(chart => {
        if (chart) chart.destroy();
      });
    };
  }, [formId]);

  // Efecto para crear los gráficos cuando cambian las estadísticas
  useEffect(() => {
    if (statistics) {
      createCharts();
    }
  }, [statistics]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const stats = await analyticsService.getFormStatistics(formId);
      setStatistics(stats);
      setError('');
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createCharts = () => {
    if (!statistics) return;
    
    statistics.statistics.forEach(questionStat => {
      if (questionStat.questionType === 'RADIO' || questionStat.questionType === 'CHECKBOX' || questionStat.questionType === 'SELECT') {
        const canvasRef = chartRefs.current[questionStat.questionId];
        
        if (canvasRef) {
          // Destruir gráfico anterior si existe
          if (chartInstances.current[questionStat.questionId]) {
            chartInstances.current[questionStat.questionId]!.destroy();
          }
          
          const ctx = canvasRef.getContext('2d');
          if (ctx) {
            const options = questionStat.data.options || [];
            const labels = options.map((option: any) => option.optionText);
            const data = options.map((option: any) => option.count);
            
            // Crear colores aleatorios
            const backgroundColors = options.map(() => {
              const r = Math.floor(Math.random() * 255);
              const g = Math.floor(Math.random() * 255);
              const b = Math.floor(Math.random() * 255);
              return `rgba(${r}, ${g}, ${b}, 0.6)`;
            });
            
            // Determinar el tipo de gráfico según el tipo de pregunta
            const chartType = questionStat.questionType === 'SELECT' || questionStat.questionType === 'RADIO' ? 'pie' : 'bar';
            
            // Crear gráfico
            chartInstances.current[questionStat.questionId] = new Chart(ctx, {
              type: chartType as any,
              data: {
                labels,
                datasets: [{
                  label: 'Respuestas',
                  data,
                  backgroundColor: backgroundColors,
                  borderColor: backgroundColors.map((color: string) => color.replace('0.6', '1')),
                  borderWidth: 1
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: chartType === 'pie',
                    position: 'bottom',
                    labels: {
                      boxWidth: 10,
                      font: {
                        size: 10
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context: any) {
                        const value = context.raw as number;
                        const total = data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${value} respuestas (${percentage}%)`;
                      }
                    }
                  },
                  datalabels: chartType === 'pie' ? {
                    display: true,
                    color: '#fff',
                    font: {
                      size: 9,
                      weight: 'bold' as const
                    },
                    formatter: (value: number) => {
                      const total = data.reduce((a: number, b: number) => a + b, 0);
                      const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                      return percentage > 5 ? `${percentage}%` : '';
                    }
                  } : {
                    display: false
                  }
                },
                scales: chartType === 'bar' ? {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                      font: {
                        size: 10
                      }
                    }
                  },
                  x: {
                    ticks: {
                      font: {
                        size: 10
                      }
                    }
                  }
                } : undefined
              }
            });
          }
        }
      }
    });
  };

  const renderQuestionStatistics = (questionStat: QuestionStatistics) => {
    switch (questionStat.questionType) {
      case 'TEXT':
      case 'TEXTAREA':
        return (
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {questionStat.totalAnswers} respuestas de texto
            </p>
          </div>
        );
        
      case 'RADIO':
      case 'SELECT':
      case 'CHECKBOX':
        const options = questionStat.data.options || [];
        const totalResponses = options.reduce((sum: number, option: any) => sum + option.count, 0);
        
        return (
          <div className="mt-4">
            <div className="mb-4">
              <div className="max-w-sm mx-auto" style={{ height: '300px' }}>
                <canvas 
                  ref={(el) => setChartRef(questionStat.questionId, el)}
                  height="200"
                ></canvas>
              </div>
            </div>
            <div className="mt-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opción
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Respuestas
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Porcentaje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {options.map((option: any) => {
                    const percentage = totalResponses > 0 ? Math.round((option.count / totalResponses) * 100) : 0;
                    
                    return (
                      <tr key={option.optionId}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {option.optionText}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {option.count}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="mr-2 text-xs">{percentage}%</span>
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
        
      case 'FILE':
        return (
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {questionStat.data.fileCount || 0} archivos subidos
            </p>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="animate-spin h-10 w-10 text-blue-500 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="mt-2 text-sm text-gray-500">Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center bg-red-50 border border-red-200 rounded-lg">
        <svg className="h-10 w-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm text-red-800">{error}</p>
        <button 
          onClick={loadStatistics} 
          className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!statistics || statistics.statistics.length === 0) {
    return (
      <div className="py-10 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay estadísticas disponibles</h3>
        <p className="mt-1 text-sm text-gray-500">
          Este formulario aún no tiene respuestas o preguntas para analizar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {statistics.statistics.map((questionStat) => (
        <div key={questionStat.questionId} className="bg-white overflow-hidden sm:rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {questionStat.questionText}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Tipo: {questionStat.questionType === 'TEXT' ? 'Texto' : 
                     questionStat.questionType === 'TEXTAREA' ? 'Texto largo' : 
                     questionStat.questionType === 'RADIO' ? 'Selección única' : 
                     questionStat.questionType === 'CHECKBOX' ? 'Selección múltiple' : 
                     questionStat.questionType === 'FILE' ? 'Archivo' : questionStat.questionType}
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            {renderQuestionStatistics(questionStat)}
          </div>
        </div>
      ))}
    </div>
  );
}
