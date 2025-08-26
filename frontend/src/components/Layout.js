import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const menuItems = [
    { 
      path: '/consultar', 
      label: 'Consultar quejas', 
      key: 'consultar',
      icon: '/resources/Icon search.png'
    },
    { 
      path: '/escribir', 
      label: 'Escribir queja', 
      key: 'escribir',
      icon: '/resources/Icon write.png'
    },
    { 
      path: '/reportes', 
      label: 'Generar reporte', 
      key: 'reportes',
      icon: '/resources/Icon check.png'
    }
  ];

  const isActive = (path) => {
    if (path === '/consultar' && location.pathname.startsWith('/quejas/')) {
      return true;
    }
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return React.createElement('div', { className: 'app' },
    // Header
    React.createElement('header', { className: 'app-header' },
      React.createElement('button', { 
        className: 'menu-toggle',
        onClick: toggleMenu
      },
        React.createElement('div', { className: 'hamburger-icon' },
          React.createElement('span', { className: 'hamburger-line' }),
          React.createElement('span', { className: 'hamburger-line' }),
          React.createElement('span', { className: 'hamburger-line' })
        ),
        React.createElement('span', { className: 'menu-text' }, 'Menu')
      ),
      React.createElement('h1', { className: 'header-title' },
        'Quejas de las entidades públicas de Boyacá'
      )
    ),

    // Sidebar Menu
    React.createElement('div', { 
      className: `sidebar ${isMenuOpen ? 'sidebar-open' : 'sidebar-closed'}` 
    },
      React.createElement('nav', { className: 'nav-menu' },
        menuItems.map((item) =>
          React.createElement('div', {
            key: item.key,
            className: `nav-item ${isActive(item.path) ? 'active' : ''}`,
            onClick: () => navigate(item.path)
          }, 
            React.createElement('img', {
              src: item.icon,
              alt: item.label,
              className: 'nav-icon'
            }),
            React.createElement('span', { className: 'nav-label' }, item.label)
          )
        )
      )
    ),
    
    React.createElement('main', { 
      className: `main-content ${isMenuOpen ? 'content-shifted' : ''}` 
    },
      children
    )
  );
};

export default Layout;
