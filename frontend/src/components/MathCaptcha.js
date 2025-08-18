import React, { useState, useEffect } from 'react';

const MathCaptcha = ({ onValidate, isValid, resetTrigger }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operation, setOperation] = useState('+');
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(0);

  // Generate new math problem
  const generateNewProblem = () => {
    const operations = ['+', '-', '*'];
    const selectedOp = operations[Math.floor(Math.random() * operations.length)];
    
    let n1, n2, answer;
    
    switch (selectedOp) {
      case '+':
        n1 = Math.floor(Math.random() * 50) + 1;
        n2 = Math.floor(Math.random() * 50) + 1;
        answer = n1 + n2;
        break;
      case '-':
        n1 = Math.floor(Math.random() * 50) + 25; // Ensure positive result
        n2 = Math.floor(Math.random() * 25) + 1;
        answer = n1 - n2;
        break;
      case '*':
        n1 = Math.floor(Math.random() * 12) + 1;
        n2 = Math.floor(Math.random() * 12) + 1;
        answer = n1 * n2;
        break;
      default:
        n1 = 1;
        n2 = 1;
        answer = 2;
    }
    
    setNum1(n1);
    setNum2(n2);
    setOperation(selectedOp);
    setCorrectAnswer(answer);
    setUserAnswer('');
    
    // Reset validation when new problem is generated
    if (onValidate) {
      onValidate(false);
    }
  };

  // Initialize with first problem
  useEffect(() => {
    generateNewProblem();
  }, []);

  // Reset when resetTrigger changes
  useEffect(() => {
    if (resetTrigger) {
      generateNewProblem();
    }
  }, [resetTrigger]);

  // Validate answer when user types
  useEffect(() => {
    const userAnswerNum = parseInt(userAnswer);
    const isCorrect = !isNaN(userAnswerNum) && userAnswerNum === correctAnswer;
    
    if (onValidate) {
      onValidate(isCorrect);
    }
  }, [userAnswer, correctAnswer, onValidate]);

  const handleInputChange = (e) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9-]/g, '');
    setUserAnswer(value);
  };

  const handleRefresh = () => {
    generateNewProblem();
  };

  return React.createElement('div', { className: 'math-captcha' },
    React.createElement('div', { className: 'captcha-header' },
      React.createElement('label', null, 'Resuelve la operación para continuar:')
    ),
    React.createElement('div', { className: 'captcha-content' },
      React.createElement('div', { className: 'math-problem' },
        React.createElement('span', { className: 'math-text' },
          `${num1} ${operation} ${num2} = `
        ),
        React.createElement('input', {
          type: 'text',
          value: userAnswer,
          onChange: handleInputChange,
          placeholder: '?',
          className: `captcha-input ${isValid === true ? 'valid' : isValid === false && userAnswer ? 'invalid' : ''}`,
          maxLength: 4
        })
      ),
      React.createElement('button', {
        type: 'button',
        onClick: handleRefresh,
        className: 'captcha-refresh-btn',
        title: 'Generar nuevo problema'
      }, '🔄')
    ),
    isValid === false && userAnswer && React.createElement('div', { className: 'captcha-error' },
      'Respuesta incorrecta. Inténtalo de nuevo.'
    )
  );
};

export default MathCaptcha;
