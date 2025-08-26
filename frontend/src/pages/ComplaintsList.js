import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Dropdown from '../components/Dropdown';

const ComplaintsList = () => {
  const { entidadId } = useParams();
  const [complaints, setComplaints] = useState([]);
  const [entityName, setEntityName] = useState('');

  useEffect(() => {
    // Fetch complaints for the specific entity
    fetch(`${process.env.REACT_APP_API_URL}/api/quejas/entidad/${entidadId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setComplaints(data.data);
        }
      })
      .catch(error => console.error('Error fetching complaints:', error));

    // Fetch entity name
    fetch(`${process.env.REACT_APP_API_URL}/api/entidades`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          const entity = data.data.find(e => e.id == entidadId);
          setEntityName(entity ? entity.nombre : 'Entidad desconocida');
        }
      })
      .catch(error => {
        console.error('Error fetching entities:', error);
        setEntityName('Entidad #' + entidadId);
      });
  }, [entidadId]);

  return React.createElement('div', { className: 'page-container' },
    React.createElement('h1', { className: 'page-title' },
      'Listado de quejas'
    ),
    
    React.createElement('div', { className: 'form-container' },
      React.createElement('div', { className: 'form-group' },
        React.createElement(Dropdown, {
          options: [{ id: entidadId, nombre: entityName }],
          selectedOption: { id: entidadId, nombre: entityName },
          onSelect: () => {},
          placeholder: entityName,
          displayKey: 'nombre',
          disabled: true
        })
      )
    ),
    
    React.createElement('div', { className: 'complaints-list' },
      complaints.length > 0 ? 
        complaints.map((complaint, index) =>
          React.createElement('div', { 
            key: complaint.id || index, 
            className: 'complaint-item' 
          },
            React.createElement('div', { className: 'complaint-title' },
              `Queja #${index + 1}`
            ),
            React.createElement('div', { className: 'complaint-description' },
              complaint.descripcion || 'Supporting line text lorem ipsum dolor sit amet, consectetur.'
            )
          )
        ) :
        React.createElement('div', { className: 'complaint-item' },
          React.createElement('div', { className: 'complaint-description' },
            'No hay quejas registradas para esta entidad.'
          )
        )
    )
  );
};

export default ComplaintsList;
