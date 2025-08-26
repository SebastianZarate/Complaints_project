import React from 'react';

const Home = () => {
  return React.createElement('div', { className: 'page-container' },
    React.createElement('div', { className: 'home-container' },
      React.createElement('div', { 
        className: 'home-wallpaper',
        style: {
          backgroundImage: 'url(/resources/wallpaper.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '100%',
          height: '60vh',
          minHeight: '400px'
        }
      })
    )
  );
};

export default Home;
