'use strict';

const CHART_MAX_TICKS = 60;

function updateResourceCharts(flow, usage, cpuChart, memChart, delayChart, instance) {
  flow = usage[flow._id];

  if (!flow) {
    return;
  }

  let combinedUsage;

  if (!instance) {
    combinedUsage = flow.reduce(
      (acc, currentValue, currentIndex) => {
        acc.cpu.user += currentValue.usage.cpu.user;
        acc.cpu.system += currentValue.usage.cpu.system;
        acc.cpu.percentage += currentValue.usage.cpu.percentage;

        acc.memory.rss += currentValue.usage.memory.rss;
        acc.memory.heapTotal += currentValue.usage.memory.heapTotal;
        acc.memory.heapUsed += currentValue.usage.memory.heapUsed;
        acc.memory.external += currentValue.usage.memory.external;

        if (!currentIndex) {
          acc.delay = currentValue.usage.delay;
        } else {
          acc.delay = ((acc.delay * currentIndex) + currentValue.usage.delay) / (currentIndex + 1);
        }

        return acc;
      },
      {
        cpu: {
          user: 0,
          system: 0,
          percentage: 0
        },
        memory: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0
        },
        delay: 0
      }
    );
  } else {
    const instangeUsage = flow.find((usageInstance) => usageInstance.flowInstanceId === instance._id);
    if (!instangeUsage) {
      return;
    }

    combinedUsage = instangeUsage.usage;
  }

  while (memChart.data.datasets[0].data.length !== memChart.data.labels.length) {
    memChart.data.datasets[0].data.push(null);
    memChart.data.datasets[1].data.push(null);
    memChart.data.datasets[2].data.push(null);

    cpuChart.data.datasets[0].data.push(null);
    delayChart.data.datasets[0].data.push(null);
  }

  if (memChart.data.datasets[0].data.length === memChart.data.labels.length) {
    memChart.data.datasets[0].data.shift();
    memChart.data.datasets[1].data.shift();
    memChart.data.datasets[2].data.shift();

    cpuChart.data.datasets[0].data.shift();
    delayChart.data.datasets[0].data.shift();
  }

  memChart.data.datasets[2].data.push(Math.round(combinedUsage.memory.rss / 1024 / 1024));
  memChart.data.datasets[1].data.push(Math.round(combinedUsage.memory.heapTotal / 1024 / 1024));
  memChart.data.datasets[0].data.push(Math.round(combinedUsage.memory.heapUsed / 1024 / 1024));
  memChart.update(0);

  cpuChart.data.datasets[0].data.push(combinedUsage.cpu.percentage);
  cpuChart.update(0);

  delayChart.data.datasets[0].data.push(combinedUsage.delay);
  delayChart.update(0);
}

function createResourceCharts(cpuCanvas, memCanvas, delayCanvas) {
  // cpu chart
  const cpuChart = new Chart(cpuCanvas, {
    type: 'line',
    data: {
      labels: new Array(CHART_MAX_TICKS),
      datasets: [
        {
          lineTension: 0,
          pointRadius: 0,
          backgroundColor: 'rgb(50, 167, 167)',
          borderColor: 'rgb(50, 167, 167)',
          borderWidth: 1,
          label: 'percentage',
          data: []
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 0
      },
      scales: {
        xAxes: [
          {
            display: false
          }
        ],
        yAxes: [
          {
            position: 'right',
            gridLines: {
              tickMarkLength: 5
            },
            ticks: {
              beginAtZero: true,
              padding: 0,
              fontColor: '#666',
              mirror: true,
              maxTicksLimit: 4,
              z: 1,
              callback: (value) => `${value} %`
            }
          }
        ]
      }
    }
  });

  // memory chart
  const memChart = new Chart(memCanvas, {
    type: 'line',
    data: {
      labels: new Array(CHART_MAX_TICKS),
      datasets: [
        {
          lineTension: 0,
          pointRadius: 0,
          borderColor: 'rgb(230, 74, 107)',
          backgroundColor: 'rgb(230, 74, 107)',
          borderWidth: 1,
          label: 'heap used',
          data: []
        }, {
          lineTension: 0,
          pointRadius: 0,
          borderColor: 'rgb(29, 137, 210)',
          backgroundColor: 'rgb(29, 137, 210)',
          borderWidth: 1,
          label: 'heap total',
          data: []
        }, {
          lineTension: 0,
          pointRadius: 0,
          borderColor: 'rgb(230, 181, 61)',
          backgroundColor: 'rgb(230, 181, 61)',
          borderWidth: 1,
          label: 'rss',
          data: []
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 0
      },
      scales: {
        xAxes: [
          {
            display: false
          }
        ],
        yAxes: [
          {
            position: 'right',
            gridLines: {
              tickMarkLength: 5
            },
            ticks: {
              beginAtZero: true,
              padding: 0,
              fontColor: '#666',
              mirror: true,
              maxTicksLimit: 4,
              z: 1,
              callback: (value) => `${value} MiB`
            }
          }
        ]
      }
    }
  });

  // delay chart
  const delayChart = new Chart(delayCanvas, {
    type: 'line',
    data: {
      labels: new Array(CHART_MAX_TICKS),
      datasets: [
        {
          lineTension: 0,
          pointRadius: 0,
          backgroundColor: 'purple',
          borderColor: 'purple',
          borderWidth: 1,
          label: 'nanoseconds',
          data: []
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 0
      },
      scales: {
        xAxes: [
          {
            display: false
          }
        ],
        yAxes: [
          {
            position: 'right',
            gridLines: {
              tickMarkLength: 5
            },
            ticks: {
              beginAtZero: true,
              padding: 0,
              fontColor: '#666',
              mirror: true,
              maxTicksLimit: 4,
              z: 1,
              callback: (value) => `${value} μs`
            }
          }
        ]
      }
    }
  });

  return {
    cpuChart,
    memChart,
    delayChart
  };
}
