const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

const stateHook = `  const [timeSeriesFilter, setTimeSeriesFilter] = useState("monthly");`;
const newStateHook = `  const [timeSeriesFilter, setTimeSeriesFilter] = useState("daily");
  const [chartStartDate, setChartStartDate] = useState("");
  const [chartEndDate, setChartEndDate] = useState("");`;

code = code.replace(stateHook, newStateHook);

// Also need to find getMultiSeriesLineChartData and replace it
const oldChartDataFnStart = `  const getMultiSeriesLineChartData = () => {
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
      const timestamp = new Date(originalDate.getFullYear(), originalDate.getMonth(), timeSeriesFilter === "daily" ? originalDate.getDate() : 1).getTime();`;

const newChartDataFnStart = `  const getMultiSeriesLineChartData = () => {
    const dataMap = {};
    
    const formatMMDDYYYY = (date) => {
       const m = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       const y = date.getFullYear();
       return \`\${m}/\${day}/\${y}\`;
    };

    const start = chartStartDate ? new Date(chartStartDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    const end = chartEndDate ? new Date(chartEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    tickets.forEach(t => {
      if (!t.feedback || !t.feedback.rating) return;
      const originalDate = new Date(t.feedback.createdAt || t.updatedAt || Date.now());
      
      if (start && originalDate < start) return;
      if (end && originalDate > end) return;
      
      const d = new Date(originalDate);
      let key = formatMMDDYYYY(d);
      
      if (timeSeriesFilter === "weekly") {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6);
        key = \`\${formatMMDDYYYY(firstDay)} - \${formatMMDDYYYY(lastDay)}\`;
      } else if (timeSeriesFilter === "monthly") {
        key = originalDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      } else if (timeSeriesFilter === "annual") {
        key = String(originalDate.getFullYear());
      }
      
      const timestamp = new Date(originalDate.getFullYear(), originalDate.getMonth(), timeSeriesFilter === "daily" ? originalDate.getDate() : 1).getTime();`;

if (code.includes(oldChartDataFnStart)) {
  code = code.replace(oldChartDataFnStart, newChartDataFnStart);
} else {
  console.log("Could not find getMultiSeriesLineChartData start.");
}

// Then we need to update the Card Header for the chart
const oldHeaderControls = `              <div className="flex flex-wrap items-center gap-2">
                <Select value={timeSeriesFilter} onValueChange={setTimeSeriesFilter}>
                  <SelectTrigger className="w-[130px] text-xs">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>`;

const newHeaderControls = `              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-1 px-2">
                  <span>Custom:</span>
                  <input 
                    type="date" 
                    className="bg-transparent border-none outline-none text-slate-800 focus:ring-0 p-0 text-xs w-[100px]"
                    value={chartStartDate}
                    onChange={(e) => setChartStartDate(e.target.value)}
                  />
                  <span>-</span>
                  <input 
                    type="date" 
                    className="bg-transparent border-none outline-none text-slate-800 focus:ring-0 p-0 text-xs w-[100px]"
                    value={chartEndDate}
                    onChange={(e) => setChartEndDate(e.target.value)}
                  />
                </div>
                <Select value={timeSeriesFilter} onValueChange={setTimeSeriesFilter}>
                  <SelectTrigger className="w-[110px] text-xs h-8">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>`;

if (code.includes(oldHeaderControls)) {
  code = code.replace(oldHeaderControls, newHeaderControls);
} else {
  console.log("Could not find header controls.");
}

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
