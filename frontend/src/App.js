import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ConsultComplaints from './pages/ConsultComplaints';
import WriteComplaint from './pages/WriteComplaint';
import ComplaintsList from './pages/ComplaintsList';
import Reports from './pages/Reports';

function App() {
  return React.createElement(Router, null,
    React.createElement(Layout, null,
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/', element: React.createElement(Home) }),
        React.createElement(Route, { path: '/consultar', element: React.createElement(ConsultComplaints) }),
        React.createElement(Route, { path: '/escribir', element: React.createElement(WriteComplaint) }),
        React.createElement(Route, { path: '/quejas/:entidadId', element: React.createElement(ComplaintsList) }),
        React.createElement(Route, { path: '/reportes', element: React.createElement(Reports) })
      )
    )
  );
}

export default App;
