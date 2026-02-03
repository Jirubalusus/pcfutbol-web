// Script to extract player data from SoFIFA pages
// This script is designed to be run via browser evaluate on each league page

// The extraction function for a single page
function extractPlayersFromPage() {
  const rows = document.querySelectorAll('table tbody tr');
  return Array.from(rows).map(row => {
    const cells = row.querySelectorAll('td');
    if (!cells || cells.length < 5) return null;
    
    // Name from first link in first cell
    const nameLink = cells[0]?.querySelector('a[href*="/player/"]');
    
    // Position links (links to /players?pn=XX)
    const posLinks = cells[0]?.querySelectorAll('a[href*="pn="]');
    
    // Age
    const age = parseInt(cells[1]?.textContent?.trim());
    
    // Overall (may have +/- text)
    const overallText = cells[2]?.querySelector('em')?.textContent?.trim() || cells[2]?.textContent?.trim();
    const overall = parseInt(overallText);
    
    // Potential
    const potentialText = cells[3]?.querySelector('em')?.textContent?.trim() || cells[3]?.textContent?.trim();
    const potential = parseInt(potentialText);
    
    // Team
    const teamLink = cells[4]?.querySelector('a[href*="/team/"]');
    const teamName = teamLink?.textContent?.trim();
    const teamIdMatch = teamLink?.getAttribute('href')?.match(/\/team\/(\d+)\//);
    const teamId = teamIdMatch ? teamIdMatch[1] : null;
    
    return {
      name: nameLink?.textContent?.trim(),
      position: Array.from(posLinks || []).map(a => a.textContent.trim()).join(','),
      age: age,
      overall: overall,
      potential: potential,
      team: teamName,
      teamId: teamId
    };
  }).filter(p => p && p.name && !isNaN(p.overall));
}

// Check if there's a next page
function hasNextPage() {
  const nextLink = document.querySelector('a[href*="offset="]');
  if (!nextLink) return null;
  const text = nextLink.textContent?.trim();
  if (text === 'Next') {
    return nextLink.href;
  }
  // Check all pagination links
  const allLinks = document.querySelectorAll('.pagination a, a[href*="offset="]');
  for (const link of allLinks) {
    if (link.textContent?.trim() === 'Next') {
      return link.href;
    }
  }
  return null;
}

console.log('Players on page:', extractPlayersFromPage().length);
console.log('Has next:', hasNextPage());
