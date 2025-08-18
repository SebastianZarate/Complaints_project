import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const ComplaintsList = () => {
  const { entidadId } = useParams();
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    // Fetch complaints for the specific entity
    fetch(`http://localhost:3002/api/quejas/entidad/${entidadId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setComplaints(data.data);
        }
      })
      .catch(error => console.error('Error fetching complaints:', error));
  }, [entidadId]);

  return React.createElement('div', null,
    React.createElement('h1', { className: 'page-title' },
      'LISTADO QUEJAS ENTIDAD',
      React.createElement('br'),
      'CONSULTADA'
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
