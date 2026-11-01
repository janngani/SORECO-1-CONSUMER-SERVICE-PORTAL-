const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// Replace Header
const oldHeader = `<CardTitle>Ratings Distribution Over Time</CardTitle>
                <CardDescription>Multi-series volume tracking of 1-5 Star satisfaction ratings</CardDescription>`;

const newHeader = `<CardTitle className="text-xl font-bold text-slate-900 tracking-tight tracking-wider uppercase">Average Ratings by Service</CardTitle>
                <div className="flex items-center gap-2 mt-2">
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
                <CardDescription className="mt-2 text-slate-500 font-medium">Tracking average feedback ratings (0-5 stars) across different service types.</CardDescription>`;

// we'll just try string replace ignoring whitespace by using a regex for the old header
code = code.replace(/<CardTitle>Ratings Distribution Over Time<\/CardTitle>\\s*<CardDescription>Multi-series volume tracking of 1-5 Star satisfaction ratings<\/CardDescription>/, newHeader);

// Add a data table below the LineChart
const oldChartSection = `                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>`;

const newChartSection = `                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="border-slate-100 shadow-sm mt-6">
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
                    {getMultiSeriesLineChartData().reverse().map((row, i) => (
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
          </Card>`;

code = code.replace(oldChartSection, newChartSection);

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
