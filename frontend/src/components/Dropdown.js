import React from 'react';

const Dropdown = ({ options, selectedOption, onSelect, placeholder, displayKey = 'name', disabled = false }) => {
  return React.createElement('div', { className: 'dropdown' },
    React.createElement('select', {
      className: 'form-select',
      value: selectedOption ? selectedOption.id : '',
      onChange: (e) => {
        if (!disabled) {
          const selected = options.find(opt => opt.id == e.target.value);
          if (selected) {
            onSelect(selected);
          }
        }
      },
      disabled: disabled
    },
      React.createElement('option', { value: '' }, placeholder),
      options.map((option) =>
        React.createElement('option', {
          key: option.id,
          value: option.id
        }, option[displayKey])
      )
    )
  );
};

export default Dropdown;
