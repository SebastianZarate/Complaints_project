import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dropdown from '../components/Dropdown';

const WriteComplaint = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [complaintText, setComplaintText] = useState('');

  useEffect(() => {
    // Fetch entities from the API
    fetch('http://localhost:3002/api/entidades')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setEntities(data.data);
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

  const handleCancel = () => {
    navigate('/');
  };

  const handleSave = () => {
    if (selectedEntity && complaintText.trim()) {
      // Submit complaint to API
      const complaintData = {
        entidad_id: selectedEntity.id,
        descripcion: complaintText.trim()
      };

      fetch('http://localhost:3002/api/quejas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(complaintData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Queja enviada exitosamente');
          navigate('/');
        } else {
          console.log('Error al enviar la queja');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        console.log('Error al enviar la queja');
      });
    }
  };

  return React.createElement('div', null,
    React.createElement('h1', { className: 'page-title' },
      'ESCRIBA LA QUEJA DE LA',
      React.createElement('br'),
      'ENTIDAD SELECCIONADA'
    ),
    
    React.createElement('div', { className: 'form-container' },
      React.createElement('div', { className: 'form-group' },
        React.createElement(Dropdown, {
          options: entities,
          selectedOption: selectedEntity,
          onSelect: setSelectedEntity,
          placeholder: selectedEntity ? selectedEntity.nombre : 'INDEPORTES',
          displayKey: 'nombre'
        })
      ),
      
      React.createElement('div', { className: 'form-group' },
        React.createElement('textarea', {
          className: 'textarea',
          placeholder: 'Escriba aquí su queja',
          value: complaintText,
          onChange: (e) => setComplaintText(e.target.value)
        })
      ),
      
      React.createElement('div', { className: 'captcha-placeholder' },
        'CAPTCHA'
      ),
      
      React.createElement('div', { className: 'button-group' },
        React.createElement('button', {
          className: 'btn btn-danger',
          onClick: handleCancel
        }, 'Cancelar'),
        React.createElement('button', {
          className: 'btn btn-success',
          onClick: handleSave,
          disabled: !selectedEntity || !complaintText.trim()
        }, 'Guardar')
      )
    )
  );
};

export default WriteComplaint;
