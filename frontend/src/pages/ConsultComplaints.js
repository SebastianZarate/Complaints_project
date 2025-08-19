import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dropdown from '../components/Dropdown';
import MathCaptcha from '../components/MathCaptcha';

const ConsultComplaints = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [captchaValid, setCaptchaValid] = useState(false);
  const [captchaReset, setCaptchaReset] = useState(0);

  useEffect(() => {
    // Fetch entities from the API
    fetch(`${process.env.REACT_APP_API_URL}/api/entidades`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setEntities(data.data);
          console.log('Entidades cargadas:', data.data);
        }
      })
      .catch(error => {
        console.error('Error fetching entities:', error);
        // Use fallback data matching the wireframe
        setEntities([
          { id: 1, nombre: 'CORPOBOYACA' },
          { id: 2, nombre: 'Lotería de Boyacá' },
          { id: 3, nombre: 'EBSA' },
          { id: 4, nombre: 'ITBOY' },
          { id: 5, nombre: 'INDEPORTES' }
        ]);
      });
  }, []);

  const handleConsult = () => {
    if (!captchaValid) {
      console.log('Por favor, resuelve el captcha antes de continuar.');
      return;
    }

    if (selectedEntity) {
      // Reset captcha after successful consultation
      setCaptchaReset(prev => prev + 1);
      navigate(`/quejas/${selectedEntity.id}`);
    }
  };

  return React.createElement('div', null,
    React.createElement('h1', { className: 'page-title' },
      'SELECCIONE LA ENTIDAD A',
      React.createElement('br'),
      'CONSULTAR LAS QUEJAS'
    ),
    
    React.createElement('div', { className: 'form-container' },
      React.createElement('div', { className: 'form-group' },
        React.createElement(Dropdown, {
          options: entities,
          selectedOption: selectedEntity,
          onSelect: setSelectedEntity,
          placeholder: 'Entidades',
          displayKey: 'nombre'
        })
      ),
      
      React.createElement(MathCaptcha, {
        onValidate: setCaptchaValid,
        isValid: captchaValid,
        resetTrigger: captchaReset
      }),
      
      React.createElement('div', { className: 'button-group' },
        React.createElement('button', {
          className: 'btn btn-primary',
          onClick: handleConsult,
          disabled: !selectedEntity || !captchaValid
        }, 'Consultar')
      )
    )
  );
};

export default ConsultComplaints;
