import React, { useState } from 'react';

const Dropdown = ({ options, selectedOption, onSelect, placeholder, displayKey = 'name' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return React.createElement('div', { className: 'dropdown' },
    React.createElement('button', {
      className: 'dropdown-button',
      onClick: handleToggle,
      type: 'button'
    },
      React.createElement('span', null,
        selectedOption ? selectedOption[displayKey] : placeholder
      ),
      React.createElement('div', {
        className: `dropdown-arrow ${isOpen ? 'open' : ''}`
      })
    ),
    
    isOpen && React.createElement('div', { className: 'dropdown-menu' },
      options.map((option) =>
        React.createElement('div', {
          key: option.id,
          className: 'dropdown-item',
          onClick: () => handleSelect(option)
        }, option[displayKey])
      )
    )
  );
};

export default Dropdown;
