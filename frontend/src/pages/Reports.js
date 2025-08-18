import React, { useState, useEffect } from 'react';

const Reports = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    // Fetch reports data
    fetch('http://localhost:3002/api/reportes')
      .then(response => response.json())
      .then(data => {
        console.log('Reports data received:', data);
        if (data.success) {
          setReports(data.data);
        }
      })
      .catch(error => {
        console.error('Error fetching reports:', error);
        // Use default data if API fails
        setReports([
          { entidad: 'CORPOBOYACA', count: 4 },
          { entidad: 'Lotería de Boyacá', count: 4 },
          { entidad: 'EBSA', count: 4 },
          { entidad: 'ITBOY', count: 4 }
        ]);
      });
  }, []);

  return React.createElement('div', null,
    React.createElement('h1', { className: 'page-title' },
      'BIENVENIDO AL MENU DE',
      React.createElement('br'),
      'RESEÑAS DE LAS',
      React.createElement('br'),
      'ENTIDADES PUBLICAS DE',
      React.createElement('br'),
      'BOYACA'
    ),
    
    React.createElement('div', { className: 'reports-table' },
      React.createElement('table', { className: 'table' },
        React.createElement('thead', null,
          React.createElement('tr', null,
            React.createElement('th', null, 'Entidad'),
            React.createElement('th', null, 'Número de Quejas')
          )
        ),
        React.createElement('tbody', null,
          reports.map((report, index) =>
            React.createElement('tr', { key: index },
              React.createElement('td', null,
                React.createElement('div', null, report.entidad)
              ),
              React.createElement('td', null,
                React.createElement('span', { className: 'complaints-count' },
                  report.count
                )
              )
            )
          )
        )
      )
    )
  );
};

export default Reports;
