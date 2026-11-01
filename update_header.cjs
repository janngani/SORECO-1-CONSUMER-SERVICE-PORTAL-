const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

const searchHeader = \`                <CardTitle>Ratings Distribution Over Time</CardTitle>
                <CardDescription>Multi-series volume tracking of 1-5 Star satisfaction ratings</CardDescription>\`;

const replaceHeader = \`<CardTitle className="text-xl font-bold text-slate-900 tracking-wider uppercase">Average Ratings by Service</CardTitle>
                <div className="flex items-center gap-2 mt-2 mb-1">
                  <h2 className="text-2xl font-semibold text-slate-800">
                    {(() => {
                      const data = getMultiSeriesLineChartData();
                      if (data.length === 0) return "No data available";
                      const first = data[0].name;
                      const last = data[data.length - 1].name;
                      if (first === last) return first;
                      return \`\${first} - \${last}\`;
                    })()}
                  </h2>
                </div>
                <CardDescription className="text-slate-500 font-medium">Tracking average feedback ratings (0-5 stars) across different service types.</CardDescription>\`;

if (code.includes(searchHeader)) {
  code = code.replace(searchHeader, replaceHeader);
} else {
  console.log("Could not find header.");
}

const searchChart = \`                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>\`;

const replaceChart = \`                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="border-slate-100 shadow-sm mt-6 mb-8">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-medium">Date Period</th>
                      <th className="px-6 py-4 font-medium">Billing Dispute</th>
                      <th className="px-6 py-4 font-medium">Other Billing Issue</th>
                      <th className="px-6 py-4 font-medium">Reconnection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getMultiSeriesLineChartData().slice().reverse().map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
                        <td className="px-6 py-4">{row["Billing Dispute"] || "-"}</td>
                        <td className="px-6 py-4">{row["Other Billing Issue"] || "-"}</td>
                        <td className="px-6 py-4">{row["Reconnection"] || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>\`;

if (code.includes(searchChart)) {
  code = code.replace(searchChart, replaceChart);
} else {
  console.log("Could not find chart container to replace.");
}

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
