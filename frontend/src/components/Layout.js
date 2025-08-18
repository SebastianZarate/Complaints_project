import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/consultar', label: 'Consultar Reseñas', key: 'consultar' },
    { path: '/escribir', label: 'Escribir Reseña', key: 'escribir' },
    { path: '/reportes', label: 'Generar reportes', key: 'reportes' }
  ];

  const isActive = (path) => {
    if (path === '/consultar' && location.pathname.startsWith('/quejas/')) {
      return true;
    }
    return location.pathname === path;
  };

  return React.createElement('div', { className: 'app' },
    React.createElement('div', { className: 'sidebar' },
      React.createElement('div', { className: 'logo-section' },
        React.createElement('div', { className: 'logo' }),
        React.createElement('div', { className: 'logo-text' },
          'Gobernación',
          React.createElement('br'),
          'de Boyacá'
        )
      ),
      
      React.createElement('nav', { className: 'nav-menu' },
        menuItems.map((item) =>
          React.createElement('button', {
            key: item.key,
            className: `nav-button ${isActive(item.path) ? 'active' : ''}`,
            onClick: () => navigate(item.path)
          }, item.label)
        )
      )
    ),
    
    React.createElement('main', { className: 'main-content' },
      children
    )
  );
};

export default Layout;
