interface Props {
  dataLoaded: boolean;
  onNewGame: () => void;
  onLoadGame: () => void;
}

export function MainMenu({ dataLoaded, onNewGame, onLoadGame }: Props) {
  return (
    <div className="main-menu">
      <div className="menu-content">
        <h1>⚽ Football Manager</h1>
        <p className="subtitle">Primera & Segunda Federación</p>

        {!dataLoaded ? (
          <div className="loading">
            <p>🔄 Cargando datos de equipos...</p>
            <p className="small">Scrapeando Transfermarkt</p>
          </div>
        ) : (
          <div className="menu-buttons">
            <button className="menu-btn primary" onClick={onNewGame}>
              🆕 Nueva Partida
            </button>
            <button className="menu-btn" onClick={onLoadGame} disabled>
              📂 Cargar Partida
            </button>
            <button className="menu-btn" disabled>
              ⚙️ Opciones
            </button>
          </div>
        )}

        <footer className="menu-footer">
          <p>Datos reales de Transfermarkt 25/26</p>
        </footer>
      </div>
    </div>
  );
}
