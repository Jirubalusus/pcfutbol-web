// SoFIFA data extraction function - to be run via browser evaluate
// Returns array of {name, position, age, overall, potential, team, teamId}
function extractPlayers() {
  const rows = document.querySelectorAll('table tbody tr');
  return Array.from(rows).map(row => {
    const cells = row.querySelectorAll('td');
    const nameLink = cells[1]?.querySelector('a');
    const posLinks = cells[1]?.querySelectorAll('a[href*="pn="]');
    const teamLink = cells[5]?.querySelector('a');
    return {
      name: nameLink?.textContent?.trim(),
      position: Array.from(posLinks || []).map(a => a.textContent.trim()).join(','),
      age: parseInt(cells[2]?.textContent?.trim()),
      overall: parseInt(cells[3]?.textContent?.trim()),
      potential: parseInt(cells[4]?.textContent?.trim()),
      team: teamLink?.textContent?.trim(),
      teamId: teamLink?.getAttribute('href')?.match(/team\/(\d+)/)?.[1]
    };
  }).filter(p => p.name && p.overall);
}
