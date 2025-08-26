import React from 'react';

const Home = () => {
  return React.createElement('div', { className: 'page-container' },
    React.createElement('div', { className: 'home-container' },
      React.createElement('img', { 
        src: '/resources/wallpaper.png',
        alt: 'Logo Quejas Boyacá',
        className: 'home-wallpaper-img',
        style: {
          maxWidth: '100%',
          maxHeight: '60vh',
          height: 'auto',
          objectFit: 'contain'
        }
      })
    )
  );
};

export default Home;
