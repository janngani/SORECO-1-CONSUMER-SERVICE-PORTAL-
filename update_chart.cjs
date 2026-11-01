const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

const getMultiSeriesLineChartDataStart = '  const getMultiSeriesLineChartData = () => {';
const getMultiSeriesLineChartDataEnd = '  const getRatingsDonutChartData = () => {';

const startIndex = code.indexOf(getMultiSeriesLineChartDataStart);
const endIndex = code.indexOf(getMultiSeriesLineChartDataEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newFunc = `  const getMultiSeriesLineChartData = () => {
    const dataMap = {};
    tickets.forEach(t => {
      if (!t.feedback || !t.feedback.rating) return;
      const originalDate = new Date(t.feedback.createdAt || t.updatedAt || Date.now());
      const d = new Date(originalDate);
      let key = d.toLocaleDateString();
      if (timeSeriesFilter === "weekly") {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        key = \`Week of \${firstDay.toLocaleDateString()}\`;
      } else if (timeSeriesFilter === "monthly") {
        key = originalDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      } else if (timeSeriesFilter === "annual") {
        key = String(originalDate.getFullYear());
      }
      const timestamp = new Date(originalDate.getFullYear(), originalDate.getMonth(), timeSeriesFilter === "daily" ? originalDate.getDate() : 1).getTime();
      
      if (!dataMap[key]) {
        dataMap[key] = { 
          name: key, 
          timestamp,
          billingSum: 0, billingCount: 0,
          otherSum: 0, otherCount: 0,
          reconnSum: 0, reconnCount: 0
        };
      }
      const rating = t.feedback.rating;
      const type = t.type || "billing";
      
      if (type === "billing" || type === "billing-dispute") {
        dataMap[key].billingSum += rating;
        dataMap[key].billingCount += 1;
      } else if (type === "other-billing") {
        dataMap[key].otherSum += rating;
        dataMap[key].otherCount += 1;
      } else if (type === "reconnection") {
        dataMap[key].reconnSum += rating;
        dataMap[key].reconnCount += 1;
      }
    });
    
    return Object.values(dataMap)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(item => ({
        name: item.name,
        timestamp: item.timestamp,
        "Billing Dispute": item.billingCount > 0 ? Number((item.billingSum / item.billingCount).toFixed(1)) : null,
        "Other Billing Issue": item.otherCount > 0 ? Number((item.otherSum / item.otherCount).toFixed(1)) : null,
        "Reconnection": item.reconnCount > 0 ? Number((item.reconnSum / item.reconnCount).toFixed(1)) : null,
      }));
  };

`;

  code = code.substring(0, startIndex) + newFunc + code.substring(endIndex);
  
} else {
  console.log("Could not find boundaries for data function");
}

// chart string replace
const oldChart = `<LineChart data={getMultiSeriesLineChartData()} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="5 Stars" stroke="#eab308" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="4 Stars" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="3 Stars" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="2 Stars" stroke="#fcd34d" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="1 Star" stroke="#fde68a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>`;

const newChart = `<LineChart data={getMultiSeriesLineChartData()} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                  <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Legend verticalAlign="top" height={36} />
                  <Line connectNulls type="monotone" dataKey="Billing Dispute" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line connectNulls type="monotone" dataKey="Other Billing Issue" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line connectNulls type="monotone" dataKey="Reconnection" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>`;

if (code.includes(oldChart)) {
  code = code.replace(oldChart, newChart);
} else {
  console.log("Could not find chart to replace, it might have been replaced already.");
}

// Header and date ranges
const oldHeaderRegex = /<CardTitle>Ratings Distribution Over Time<\/CardTitle>\\s*<CardDescription>Multi-series volume tracking of 1-5 Star satisfaction ratings<\/CardDescription>/;

// The user also wants to see the date range comparison.
// We can compute a dynamic date range from the chart data, or just show a nice UI based on their screenshot.
const newHeader = `<CardTitle>AI USAGE - Average Ratings by Service</CardTitle>
                <CardDescription className="text-sm font-medium mt-1">
                  {(() => {
                    const data = getMultiSeriesLineChartData();
                    if (data.length === 0) return "No data available";
                    const first = data[0].name;
                    const last = data[data.length - 1].name;
                    if (first === last) return first;
                    return \`\${first} - \${last}\`;
                  })()}
                </CardDescription>
                <div className="text-xs text-slate-500 mt-2">Filter and info for types of services based on the color of the line</div>`;

code = code.replace(oldHeaderRegex, newHeader);

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
