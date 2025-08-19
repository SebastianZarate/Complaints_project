import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dropdown from '../components/Dropdown';
import MathCaptcha from '../components/MathCaptcha';

const WriteComplaint = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [complaintText, setComplaintText] = useState('');
  const [captchaValid, setCaptchaValid] = useState(false);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validación del texto de la queja
  const validateComplaintText = (text) => {
    const trimmedText = text.trim();
    if (trimmedText.length < 10) {
      return 'La queja debe tener al menos 10 caracteres.';
    }
    if (trimmedText.length > 250) {
      return 'La queja no puede exceder los 250 caracteres.';
    }
    return null;
  };

  useEffect(() => {
    // Fetch entities from the API
    fetch(`${process.env.REACT_APP_API_URL}/api/entidades`)
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
    if (!captchaValid) {
      setMessage('Por favor, resuelve el captcha antes de continuar.');
      setMessageType('error');
      return;
    }

    if (!selectedEntity) {
      setMessage('Por favor, selecciona una entidad.');
      setMessageType('error');
      return;
    }

    // Validar el texto de la queja
    const textValidationError = validateComplaintText(complaintText);
    if (textValidationError) {
      setMessage(textValidationError);
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setMessageType('');

    // Submit complaint to API
    const complaintData = {
      entidad_id: selectedEntity.id,
      descripcion: complaintText.trim()
    };

    fetch(`${process.env.REACT_APP_API_URL}/api/quejas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(complaintData)
    })
    .then(response => response.json())
    .then(data => {
      setIsSubmitting(false);
      if (data.success) {
        setMessage('La queja ha sido registrada exitosamente');
        setMessageType('success');
        // Reset captcha after successful submission
        setCaptchaReset(prev => prev + 1);
        // Clear form
        setSelectedEntity(null);
        setComplaintText('');
        // Navigate after showing success message
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setMessage('Error al registrar la queja. Por favor, inténtalo de nuevo.');
        setMessageType('error');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      setIsSubmitting(false);
      setMessage('Error de conexión. Por favor, verifica tu conexión e inténtalo de nuevo.');
      setMessageType('error');
    });
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
          placeholder: selectedEntity ? selectedEntity.nombre : 'Seleccione una entidad',
          displayKey: 'nombre'
        })
      ),
      
      React.createElement('div', { className: 'form-group' },
        React.createElement('textarea', {
          className: 'textarea',
          placeholder: 'Escriba aquí su queja (mínimo 10 caracteres, máximo 250)',
          value: complaintText,
          maxLength: 250,
          onChange: (e) => setComplaintText(e.target.value)
        }),
        React.createElement('div', { className: 'character-counter' },
          React.createElement('span', { 
            className: complaintText.trim().length < 10 ? 'counter-error' : 
                      complaintText.length > 200 ? 'counter-warning' : 'counter-normal'
          }, 
            `${complaintText.length}/250 caracteres`
          ),
          complaintText.trim().length < 10 && React.createElement('span', { className: 'validation-hint' },
            ` (mínimo 10 caracteres)`
          )
        )
      ),
      
      React.createElement(MathCaptcha, {
        onValidate: setCaptchaValid,
        isValid: captchaValid,
        resetTrigger: captchaReset
      }),
      
      message && React.createElement('div', { 
        className: `message ${messageType}`,
        style: {
          padding: '10px',
          margin: '15px 0',
          borderRadius: '4px',
          textAlign: 'center',
          fontWeight: 'bold',
          backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
          color: messageType === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }
      }, message),
      
      React.createElement('div', { className: 'button-group' },
        React.createElement('button', {
          className: 'btn btn-danger',
          onClick: handleCancel,
          disabled: isSubmitting
        }, 'Cancelar'),
        React.createElement('button', {
          className: 'btn btn-success',
          onClick: handleSave,
          disabled: !selectedEntity || validateComplaintText(complaintText) !== null || !captchaValid || isSubmitting
        }, isSubmitting ? 'Guardando...' : 'Guardar')
      )
    )
  );
};

export default WriteComplaint;
