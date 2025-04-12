const API_KEY = 'AIzaSyCo5NvQZpziJdaCsOjf1H2Rq-1YeiU9Uq8';
let viewHistory = [];
let intervalId = null;
let chart = null;
let targetViews = 0;
let endTime = null;

function formatNumber(num) {
  return num.toLocaleString();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getViewsInLastMinutes(mins) {
  const cutoff = Date.now() - mins * 60 * 1000;
  return viewHistory.filter(d => d.time >= cutoff);
}

function getAvgViewsPerMinute(minutes) {
  const data = getViewsInLastMinutes(minutes);
  if (data.length < 2) return '-';
  const views = data[data.length - 1].views - data[0].views;
  const timeSpan = (data[data.length - 1].time - data[0].time) / 60000;
  return timeSpan > 0 ? views / timeSpan : 0;
}

function updateChart() {
  const labels = viewHistory.map(d => new Date(d.time).toLocaleTimeString());
  const data = viewHistory.map(d => d.views);

  if (!chart) {
    const ctx = document.getElementById('viewChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Live Views',
          data,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0,123,255,0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            ticks: {
              callback: value => formatNumber(value)
            }
          }
        }
      }
    });
  } else {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  }
}

async function fetchViews(videoId) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${API_KEY}`);
  const data = await res.json();
  const views = parseInt(data.items[0]?.statistics?.viewCount || 0);
  return views;
}

async function updateStats(videoId) {
  const currentViews = await fetchViews(videoId);
  const currentTime = Date.now();
  viewHistory.push({ time: currentTime, views: currentViews });
  updateChart();

  const elapsedTime = (endTime - currentTime) / 1000;
  const timeLeft = Math.max(0, Math.round(elapsedTime));
  const viewsNeeded = Math.max(0, targetViews - currentViews);
  const minsLeft = timeLeft / 60;
  const requiredPerMin = minsLeft > 0 ? (viewsNeeded / minsLeft).toFixed(2) : '-';
  const projectedViews = viewHistory.length > 1
    ? currentViews + (getAvgViewsPerMinute(15) * minsLeft)
    : '-';

  const viewDiff = targetViews - currentViews;
  const viewDiffClass = (getAvgViewsPerMinute(15) * minsLeft >= viewDiff) ? 'green' : 'red';

  const segments = [5, 10, 15, 20, 25, 30];
  const segmentViews = segments.map(m => {
    const data = getViewsInLastMinutes(m);
    return data.length > 1 ? data[data.length - 1].views - data[0].views : '-';
  });

  const avg15 = getAvgViewsPerMinute(15);

  const statsHtml = `
    Live View Count: ${formatNumber(currentViews)}<br>
    Last 5 min Views: ${segmentViews[0] === '-' ? 'Collecting data...' : formatNumber(segmentViews[0])}<br>
    Last 10 min Views: ${segmentViews[1] === '-' ? 'Collecting data...' : formatNumber(segmentViews[1])}<br>
    Last 15 min Views: ${segmentViews[2] === '-' ? 'Collecting data...' : formatNumber(segmentViews[2])}<br>
    Last 20 min Views: ${segmentViews[3] === '-' ? 'Collecting data...' : formatNumber(segmentViews[3])}<br>
    Last 25 min Views: ${segmentViews[4] === '-' ? 'Collecting data...' : formatNumber(segmentViews[4])}<br>
    Last 30 min Views: ${segmentViews[5] === '-' ? 'Collecting data...' : formatNumber(segmentViews[5])}<br>
    Avg Views/Min (Last 15 min): ${avg15 === '-' ? '-' : avg15.toFixed(2)}<br>
    Views/min Required: ${requiredPerMin}<br>
    Projected Views: ${typeof projectedViews === 'number' ? formatNumber(Math.floor(projectedViews)) : '-'}<br>
    Forecast: ${typeof projectedViews === 'number' ? (projectedViews >= targetViews ? 'Yes' : 'No') : '-'}<br>
    Time Left: ${formatTime(timeLeft)}<br>
    Views Left to Meet Target: <span class="${viewDiffClass}">${formatNumber(viewDiff)}</span>
  `;

  document.getElementById('stats').innerHTML = statsHtml;
  document.getElementById('spinner').style.display = viewHistory.length < 3 ? 'block' : 'none';
}

function startTracking() {
  const videoId = document.getElementById('videoId').value;
  targetViews = parseInt(document.getElementById('targetViews').value);
  const minutes = parseInt(document.getElementById('targetTime').value);
  endTime = Date.now() + minutes * 60 * 1000;

  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => updateStats(videoId), 60000);
  updateStats(videoId);
                                   }
