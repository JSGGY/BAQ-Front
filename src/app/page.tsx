'use client';

import React, { useState, useEffect, useRef } from "react";
import { DonationStreakRef, handleStreakCalculation, createConfetti, StreakData, getDonationHistory, isDateInStreak } from "../components/DonationStreak";
import { motion, AnimatePresence } from 'framer-motion';
import DonationStreakPopup from "../components/DonationStreakPopup";
import DonationStreakMinimized from "../components/DonationStreakMinimized";

const cantidades = [12, 20, 30, 50];

// SVG simple de niño (puedes reemplazarlo por uno más bonito si lo deseas)
const NinoSVG = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" style={{margin: '0 2px'}}>
    <circle cx="19" cy="11" r="7" fill="#FFD580" stroke="#FF7300" strokeWidth="2"/>
    <rect x="12" y="18" width="14" height="14" rx="7" fill="#FFB347" stroke="#FF7300" strokeWidth="2"/>
    <rect x="7" y="32" width="6" height="4" rx="2" fill="#FF7300"/>
    <rect x="25" y="32" width="6" height="4" rx="2" fill="#FF7300"/>
  </svg>
);

function calcularNinios(monto: number) {
  return Math.max(1, Math.floor(monto / 12));
}

const accionesFundacion = [
  "Entrega de alimentos nutritivos",
  "Charlas de educación alimentaria",
  "Apoyo a comedores comunitarios",
  "Seguimiento a familias vulnerables",
  "Promoción de hábitos saludables"
];

export default function DonacionPage() {
  const [tipo, setTipo] = useState("mensual");
  const [cantidad, setCantidad] = useState(12);
  const [otro, setOtro] = useState("");
  const [otroActivo, setOtroActivo] = useState(false);
  const [ninios, setNinios] = useState(calcularNinios(12));
  const [animNinios, setAnimNinios] = useState(calcularNinios(12));
  const animRef = useRef<number | null>(null);
  
  // Reference to streak component
  const streakRef = useRef<DonationStreakRef>(null);

  // Estado para el popup de racha
  const [showPopup, setShowPopup] = useState(false);
  const [popupPhase, setPopupPhase] = useState<'loading' | 'complete' | 'minimized'>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [streakData, setStreakData] = useState<StreakData>(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('donationStreak');
      if (savedData) {
        return JSON.parse(savedData);
      }
    }
    return {
      currentStreak: 0,
      lastDonationDate: null,
      longestStreak: 0,
      totalDonations: 0,
      donationHistory: []
    };
  });

  // Efecto para actualizar el estado desde localStorage si cambia
  useEffect(() => {
    const updateStreakFromStorage = () => {
      if (typeof window !== 'undefined') {
        const savedData = localStorage.getItem('donationStreak');
        if (savedData) {
          const data = JSON.parse(savedData);
          setStreakData(data);
          setDonationHistory(data.donationHistory || []);
          console.log("Estado actualizado desde localStorage:", data);
        }
      }
    };

    // Actualizar al inicio
    updateStreakFromStorage();

    // Configurar evento de storage para actualizar si otros componentes cambian localStorage
    window.addEventListener('storage', updateStreakFromStorage);
    return () => window.removeEventListener('storage', updateStreakFromStorage);
  }, []);
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [streakAnimating, setStreakAnimating] = useState(false);
  const [donationHistory, setDonationHistory] = useState<Array<{date: string, amount?: number, breakPoint?: boolean, milestone?: boolean}>>([]);
  
  // Referencias para animaciones
  const confettiRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const popupTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const target = calcularNinios(cantidad);
    if (animRef.current) clearInterval(animRef.current);
    if (animNinios === target) return;
    const step = animNinios < target ? 1 : -1;
    animRef.current = window.setInterval(() => {
      setAnimNinios(prev => {
        if (prev === target) {
          if (animRef.current) clearInterval(animRef.current);
          return prev;
        }
        return prev + step;
      });
    }, 60);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [cantidad, animNinios]);

  useEffect(() => {
    setNinios(calcularNinios(cantidad));
  }, [cantidad]);

  const handleCantidad = (valor: number) => {
    setCantidad(valor);
    setOtroActivo(false);
    setOtro("");
  };

  const handleOtro = () => {
    setCantidad(0);
    setOtroActivo(true);
  };

  // Para mostrar máximo 10 niños y el resto como +N
  const maxNinos = 10;
  const ninosExtra = animNinios > maxNinos ? animNinios - maxNinos : 0;
  const ninosArray = Array(Math.min(animNinios, maxNinos)).fill(0);

  // Cargar historial de donaciones
  useEffect(() => {
    const history = getDonationHistory();
    setDonationHistory(history);
  }, []);

  // Handler para el botón de donación
  const handleDonarClick = () => {
    // Mostrar popup y empezar animación de carga
    setShowPopup(true);
    setPopupPhase('loading');
    setLoadingProgress(0);
    
    // Simular progreso de carga
    if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    
    progressIntervalRef.current = window.setInterval(() => {
      setLoadingProgress(prev => {
        const newValue = prev + 2; // Ajustar velocidad
        if (newValue >= 100) {
          if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
          
          // Cuando la carga está completa, procesar donación
          const donationAmount = otroActivo ? Number(otro) : cantidad;
          
          // IMPORTANTE: Crear nueva copia del objeto de datos actual
          const currentData = {...streakData};
          
          // Actualizar explícitamente para forzar cambio de estado
          const newStreak = currentData.currentStreak + 1;
          const newTotalDonations = currentData.totalDonations + 1;
          
          // Fecha actual
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          
          // Verificar si esta donación es un hito
          const isMilestone = newTotalDonations % 5 === 0;
          
          // Crear nuevo historial
          const newHistory = [...currentData.donationHistory || []];
          newHistory.push({
            date: todayStr,
            amount: donationAmount,
            milestone: isMilestone
          });
          
          // Limitar a 20 entradas (cambiado de 12 a 20)
          if (newHistory.length > 20) {
            newHistory.splice(0, newHistory.length - 20);
          }
          
          // Crear nuevo objeto de estado (importante para que React detecte el cambio)
          const newStreakData = {
            currentStreak: newStreak,
            lastDonationDate: todayStr,
            longestStreak: Math.max(newStreak, currentData.longestStreak),
            totalDonations: newTotalDonations,
            donationHistory: newHistory
          };
          
          // Actualizar localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('donationStreak', JSON.stringify(newStreakData));
          }
          
          // Actualizar estados de React
          setStreakData(newStreakData);
          setDonationHistory(newHistory);
          console.log('Estado actualizado manualmente:', newStreakData);
          
          // Continuar con el resto del proceso
          setPopupPhase('complete');
          setShowConfetti(true);
          setStreakAnimating(true);
          
          setTimeout(() => setStreakAnimating(false), 1500);
          setTimeout(() => setShowConfetti(false), 3000);
          
          // Activar efecto confetti
          if (confettiRef.current) {
            createConfetti(confettiRef.current, 80);
          }
          
          // Efecto especial para hitos
          if (isMilestone) {
            setTimeout(() => {
              if (confettiRef.current) {
                createConfetti(confettiRef.current, 120);
              }
            }, 800);
          }
          
          // Minimizar popup después de un tiempo
          if (popupTimeoutRef.current) window.clearTimeout(popupTimeoutRef.current);
          popupTimeoutRef.current = window.setTimeout(() => {
            setPopupPhase('minimized');
          }, 5000);
          
          return 100;
        }
        return newValue;
      });
    }, 30);
  };

  // Función para test rápido de incremento de racha (solo desarrollo)
  const testIncrementStreak = () => {
    // Crear copia del estado actual
    const currentData = {...streakData};
    
    // Incrementar valores directamente
    const newStreak = currentData.currentStreak + 1;
    const newTotalDonations = currentData.totalDonations + 1;
    
    // Fecha actual
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Verificar si esta donación es un hito
    const isMilestone = newTotalDonations % 5 === 0;
    
    // Crear nuevo historial
    const newHistory = [...currentData.donationHistory || []];
    newHistory.push({
      date: todayStr,
      amount: 10, // Valor fijo para pruebas
      milestone: isMilestone
    });
    
    // Limitar a 20 entradas (cambiado de 12 a 20)
    if (newHistory.length > 20) {
      newHistory.splice(0, newHistory.length - 20);
    }
    
    // Crear nuevo objeto de estado
    const newStreakData = {
      currentStreak: newStreak,
      lastDonationDate: todayStr,
      longestStreak: Math.max(newStreak, currentData.longestStreak),
      totalDonations: newTotalDonations,
      donationHistory: newHistory
    };
    
    // Actualizar localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('donationStreak', JSON.stringify(newStreakData));
    }
    
    // Actualizar estados de React
    setStreakData(newStreakData);
    setDonationHistory(newHistory);
    
    console.log('Racha incrementada manualmente:', newStreakData);
    
    // Mostrar efectos visuales
    setShowConfetti(true);
    setStreakAnimating(true);
    setTimeout(() => setStreakAnimating(false), 1500);
    setTimeout(() => setShowConfetti(false), 3000);
    
    return newStreakData;
  };

  // Función para generar mensaje de celebración basado en la racha
  const getCelebrationMessage = () => {
    const streak = streakData.currentStreak;
    const totalDonations = streakData.totalDonations;
    
    // Mensajes especiales para hitos (cada 5 donaciones)
    if (totalDonations % 5 === 0) {
      return `¡INCREÍBLE! ¡${totalDonations} donaciones en total! 🏆`;
    }
    
    // Mensajes basados en la racha actual
    if (streak === 1) {
      return '¡Primera donación! ¡Bienvenido a la lucha contra el hambre!';
    } else if (streak === 3) {
      return '¡3 donaciones seguidas! ¡Vas muy bien! 🔥';
    } else if (streak === 5) {
      return '¡5 donaciones en racha! ¡Fantástico! 🌟';
    } else if (streak === 10) {
      return '¡INCREÍBLE! ¡10 donaciones consecutivas! 🏆';
    } else if (streak % 5 === 0) {
      return `¡${streak} donaciones en racha! ¡Eres increíble! 🎉`;
    } else {
      return `¡${streak} donaciones seguidas! 🔥`;
    }
  };

  // Cerrar o minimizar el popup
  const handleClosePopup = () => {
    if (popupPhase === 'complete') {
      setPopupPhase('minimized');
    } else if (popupPhase === 'minimized') {
      setShowPopup(false);
    }
  };
  
  // Alternar entre minimizado y completo
  const handleTogglePopup = () => {
    if (popupPhase === 'minimized') {
      setPopupPhase('complete');
    } else if (popupPhase === 'complete') {
      setPopupPhase('minimized');
    }
  };

  // Limpiar intervalos/timeouts al desmontar
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      if (popupTimeoutRef.current) window.clearTimeout(popupTimeoutRef.current);
    };
  }, []);

  // Añadir función para reiniciar la racha
  const resetStreak = () => {
    // Confirmar con el usuario antes de reiniciar
    if (confirm('¿Estás seguro que deseas reiniciar tu racha de donaciones? Esta acción no se puede deshacer.')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('donationStreak');
        setStreakData({
          currentStreak: 0,
          lastDonationDate: null,
          longestStreak: 0,
          totalDonations: 0,
          donationHistory: []
        });
        setDonationHistory([]);
        
        // Aplicar cambio visual de inmediato
        calculateProgressWidth(0, 'points-container-main');
        calculateProgressWidth(0, 'points-container-mini');
        
        // Opcional: mostrar mensaje de éxito
        alert('Tu racha de donaciones ha sido reiniciada correctamente.');
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff7ed" }}>
      <style>{`
        body, html, #__next {
          background: #fff !important;
        }
        .header-bar img {
          height: 120px;
          width: 120px;
          object-fit: contain;
          border-radius: 0;
          background: none;
          margin-right: 0;
          margin-left: 8px;
        }
        .welcome-section {
          width: 100vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 0;
          margin-bottom: 32px;
          padding-top: 24px;
          padding-bottom: 8px;
        }
        .welcome-title {
          font-size: 2.6rem;
          font-weight: 900;
          color: #ff7300;
          letter-spacing: 1px;
          animation: fadeInDown 1s cubic-bezier(.68,-0.55,.27,1.55);
        }
        .welcome-subtitle {
          font-size: 1.5rem;
          font-weight: 700;
          color: #b85c00;
          margin-top: 8px;
          letter-spacing: 0.5px;
          animation: fadeInUp 1.2s cubic-bezier(.68,-0.55,.27,1.55);
        }
        @keyframes fadeInDown {
          0% { opacity: 0; transform: translateY(-40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .main-flex {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 48px;
          min-height: 100vh;
          padding-top: 0;
          width: 100vw;
        }
        .main-left {
          flex: 1 1 420px;
          max-width: 440px;
          min-width: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .main-right {
          flex: 1 1 420px;
          max-width: 480px;
          min-width: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .donacion-card {
          background: #fff;
          border-radius: 32px;
          padding: 44px 36px 36px 36px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(255,140,0,0.13);
          position: relative;
          z-index: 1;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .donacion-desc {
          text-align: center;
          font-size: 1.1rem;
          color: #b85c00;
          margin-bottom: 28px;
          font-weight: 500;
        }
        .donacion-btn-group {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
          gap: 18px;
          width: 100%;
        }
        .donacion-btn {
          background: #fff3e0;
          color: #b85c00;
          border: none;
          border-radius: 24px;
          padding: 16px 40px;
          font-weight: 700;
          font-size: 1.1rem;
          box-shadow: 0 2px 8px rgba(255,140,0,0.10);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }
        .donacion-btn.selected {
          background: linear-gradient(90deg, #ff7300 40%, #ffb347 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(255,140,0,0.18);
          transform: scale(1.08);
        }
        .donacion-btn.selected::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%);
          pointer-events: none;
          animation: pulsateBtn 2s infinite;
        }
        .donacion-btn:hover {
          background: #ffe0b2;
          color: #ff7300;
          transform: translateY(-3px);
        }
        .donacion-btn:active {
          transform: translateY(0px);
        }
        .donacion-btn svg {
          width: 22px;
          height: 22px;
          transition: transform 0.3s ease;
        }
        .donacion-btn.selected svg {
          transform: scale(1.2);
          filter: drop-shadow(0 0 2px rgba(255,255,255,0.8));
        }
        .donacion-btn.selected svg path {
          fill: white;
        }
        .donacion-monto-label {
          text-align: center;
          font-weight: 700;
          margin-bottom: 18px;
          color: #b85c00;
          font-size: 1.1rem;
          letter-spacing: 0.2px;
        }
        .donacion-montos {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 20px;
          justify-content: center;
          width: 100%;
        }
        .donacion-monto-btn {
          background: #fff3e0;
          color: #b85c00;
          border: none;
          border-radius: 18px;
          padding: 18px 28px;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 2px 8px rgba(255,140,0,0.08);
          min-width: 110px;
          position: relative;
          overflow: hidden;
        }
        .donacion-monto-btn.selected {
          background: linear-gradient(90deg, #ff7300 40%, #ffb347 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(255,140,0,0.18);
          transform: scale(1.1);
        }
        .donacion-monto-btn.selected::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%);
          pointer-events: none;
          animation: pulsateBtn 2s infinite;
        }
        .donacion-monto-btn:hover {
          background: #ffe0b2;
          color: #ff7300;
          transform: translateY(-3px);
        }
        .donacion-monto-btn:active {
          transform: translateY(0px);
        }
        .donacion-input-row {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          width: 100%;
        }
        .donacion-input-currency {
          background: #fff3e0;
          border-radius: 12px;
          padding: 16px 8px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          color: #b85c00;
        }
        .donacion-input {
          flex: 2;
          border: none;
          border-radius: 12px;
          padding: 16px 8px;
          font-weight: 700;
          font-size: 18px;
          outline: none;
          background: #fff;
          color: #b85c00;
          box-shadow: 0 1px 4px rgba(255,140,0,0.06);
        }
        .donar-btn {
          width: 100%;
          background: linear-gradient(90deg, #ff7300 40%, #ffb347 100%);
          color: #fff;
          border: none;
          border-radius: 24px;
          padding: 22px 0;
          font-weight: 900;
          font-size: 1.5rem;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(255,140,0,0.13);
          letter-spacing: 1px;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          margin-top: 18px;
          margin-bottom: 0;
          display: block;
          position: relative;
          overflow: hidden;
        }
        .donar-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 70%;
          height: 100%;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-25deg);
          animation: shineDonate 3s infinite;
        }
        .donar-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 24px rgba(255,140,0,0.2);
        }
        .donar-btn:active {
          transform: translateY(1px);
        }
        .donar-btn[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
          animation: none;
        }
        @keyframes shineDonate {
          0% { left: -100%; }
          20% { left: 150%; }
          100% { left: 150%; }
        }
        .donacion-warning {
          color: #ff7300;
          font-weight: 700;
          text-align: center;
          margin-bottom: 12px;
          font-size: 1.1rem;
        }
        .ninios-anim {
          width: 100%;
          background: linear-gradient(120deg, #ffb347 60%, #ff7300 100%);
          border-radius: 24px;
          box-shadow: 0 4px 24px rgba(255,140,0,0.10);
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          animation: fadeInBounce 1.2s cubic-bezier(.68,-0.55,.27,1.55);
        }
        .ninios-anim span {
          font-size: 60px;
          font-weight: 900;
          color: #fff;
          text-shadow: 0 2px 12px rgba(255,140,0,0.18);
          transition: color 0.2s;
        }
        .ninios-anim label {
          color: #fff;
          font-size: 20px;
          font-weight: 600;
          margin-top: 8px;
          letter-spacing: 0.5px;
        }
        .ninios-svg-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          margin-top: 12px;
          min-height: 44px;
        }
        .ninios-svg-row svg {
          width: 32px;
          height: 32px;
        }
        .ninios-svg-row svg {
          width: 32px;
          height: 32px;
        }
        .ninios-svg-extra {
          color: #fff;
          font-weight: 700;
          font-size: 22px;
          margin-left: 6px;
        }
        .platos-section {
          margin-top: 18px;
          background: #fff3e0;
          border-radius: 16px;
          padding: 18px 12px;
          color: #b85c00;
          font-size: 1.2rem;
          font-weight: 700;
          text-align: center;
          box-shadow: 0 2px 8px rgba(255,140,0,0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .platos-section .platos-num {
          color: #ff7300;
          font-size: 2.1rem;
          font-weight: 900;
          margin-bottom: 2px;
          transition: color 0.2s;
        }
        .platos-section .platos-label {
          color: #b85c00;
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .info-section {
          width: 100%;
          background: #e0f2f1;
          border-radius: 24px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
          margin-bottom: 0;
          padding: 32px 24px 24px 24px;
        }
        .info-title {
          font-size: 2rem;
          font-weight: 900;
          color: #009688;
          text-align: center;
          margin-bottom: 12px;
          margin-top: 0;
        }
        .info-desc {
          color: #333;
          font-size: 1.15rem;
          text-align: center;
          font-weight: 500;
          margin-bottom: 18px;
        }
        .info-divider {
          width: 60%;
          margin: 24px auto;
          border-top: 2px solid #b2dfdb;
          opacity: 0.5;
        }
        .info-title2 {
          font-size: 1.3rem;
          font-weight: 900;
          color: #009688;
          text-align: center;
          margin-bottom: 12px;
        }
        .info-desc2 {
          color: #333;
          font-size: 1.05rem;
          text-align: center;
          font-weight: 500;
        }
        .info-block {
          margin: 0 auto;
          padding: 24px 0 0 0;
          background: none;
          border-radius: 0;
          box-shadow: none;
        }
        .info-block ul {
          margin: 18px 0 0 24px;
          padding: 0;
        }
        .info-block li {
          font-size: 1.1rem;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .info-block strong {
          color: #009688;
        }
        @media (max-width: 1100px) {
          .main-flex { flex-direction: column; align-items: center; gap: 24px; padding-top: 0; }
          .main-left, .main-right { max-width: 99vw; min-width: 0; width: 100%; }
        }
        @media (max-width: 600px) {
          .header-bar img { height: 80px; width: 80px; }
          .welcome-title { font-size: 1.5rem; }
          .welcome-subtitle { font-size: 1.1rem; }
          .main-flex { gap: 12px; }
          .main-left, .main-right { padding: 0 2px; }
          .donacion-card { padding: 14px 2px; border-radius: 14px; }
          .ninios-anim { padding: 14px 2px; border-radius: 14px; }
          .ninios-anim span { font-size: 36px; }
          .ninios-anim label { font-size: 14px; }
          .ninios-svg-row svg { width: 22px; height: 22px; }
          .platos-section { font-size: 1rem; padding: 10px 2px; border-radius: 10px; }
          .platos-section .platos-num { font-size: 1.3rem; }
          .info-section { border-radius: 12px; padding: 12px 2px 10px 2px; }
          .info-title, .info-title2 { font-size: 1.1rem; }
          .info-block li { font-size: 0.95rem; }
        }
        
        /* Nuevos estilos para el popup de racha */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(3px);
        }
        
        .popup-container {
          position: relative;
          background: linear-gradient(135deg, #ff7300 0%, #ffad4d 100%);
          border-radius: 24px;
          padding: 28px 24px 24px 24px;
          max-width: 420px;
          width: 92%;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        
        .popup-minimized {
          position: fixed;
          bottom: 20px;
          right: 20px;
          left: auto;
          transform: none;
          background: linear-gradient(135deg, #ff7300 0%, #ffad4d 100%);
          border-radius: 16px;
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 300px;
          min-width: 250px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          z-index: 100;
        }
        
        .popup-minimized .popup-title-small {
          display: flex;
          align-items: center;
          margin-bottom: 2px;
        }
        
        .progress-bar-container {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
        }
        
        .progress-bar {
          height: 100%;
          background: rgba(255, 255, 255, 0.8);
          width: 0%;
          transition: width 0.1s linear;
        }
        
        .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          z-index: 10;
        }
        
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.4);
        }
        
        .popup-title {
          color: white;
          font-size: 1.5rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .popup-title-small {
          color: white;
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        
        .streak-flame {
          width: 28px;
          height: 28px;
          margin-right: 8px;
          color: white;
        }
        
        .streak-flame-small {
          width: 20px;
          height: 20px;
          margin-right: 6px;
          color: white;
        }
        
        .streak-number {
          font-size: 4.5rem;
          font-weight: 900;
          color: white;
          text-align: center;
          margin: 20px 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }
        
        .streak-number-small {
          font-size: 1.5rem;
          font-weight: 900;
          color: white;
          margin: 0 0 0 5px;
        }
        
        .streak-message {
          color: white;
          font-size: 1.2rem;
          font-weight: 600;
          text-align: center;
          margin-bottom: 24px;
        }
        
        .streak-stats {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 16px;
        }
        
        .stat-item {
          text-align: center;
          flex: 1;
        }
        
        .stat-value {
          font-size: 1.8rem;
          font-weight: 800;
          color: white;
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
        }
        
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }
        
        .animate-streak {
          animation: pulseStreak 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        
        @keyframes pulseStreak {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        .glow-effect {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 250%;
          height: 250%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 60%);
          opacity: 0;
          pointer-events: none;
          z-index: 5;
        }
        
        .glow-effect.active {
          animation: glowPulse 1.5s ease-out;
        }
        
        @keyframes glowPulse {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          40% { opacity: 0.4; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
        }
        
        /* Estilos para línea cronológica de donaciones */
        .donation-timeline {
          margin-top: 20px;
          padding: 10px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .timeline-title {
          color: white;
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 15px;
          text-align: center;
        }
        
        /* Estilos para la barra de progreso estilo videojuego */
        .points-bar-container {
          margin-top: 15px;
          width: 100%;
          padding: 10px 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }
        
        .points-progress-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0;
          position: relative;
        }
        
        .points-container {
          --progress-width: 0%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 80%;
          position: relative;
          margin: 0;
          padding: 0;
        }
        
        /* Añadir más datos de debug para verificar el correcto funcionamiento */
        .debug-info {
          font-size: 10px; 
          text-align: center; 
          color: white; 
          margin-bottom: 3px;
          display: flex;
          flex-direction: column;
        }
        
        .debug-points {
          font-size: 9px;
          display: flex;
          justify-content: space-between;
          width: 80%;
          margin: 0 auto 2px auto;
        }
        
        .debug-point {
          width: 18px;
          text-align: center;
        }
        
        /* Línea base (gris) */
        .points-container::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-50%);
          z-index: 1;
          border-radius: 1px;
        }
        
        /* Línea de progreso (blanca) */
        .points-container::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          height: 2px;
          background: linear-gradient(90deg, #ffffff 70%, rgba(255, 255, 255, 0.5) 100%);
          transform: translateY(-50%);
          z-index: 1;
          transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.8), 0 0 2px #ffca28;
          border-radius: 1px;
          width: var(--progress-width);
        }
        
        /* Estilo para los puntos */
        .progress-point {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          z-index: 2;
          position: relative;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Punto vacío (no alcanzado) */
        .progress-point.empty {
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.4);
        }
        
        /* Punto lleno (alcanzado) */
        .progress-point.filled {
          background: #ffca28;
          border: 2px solid #ff9800;
          box-shadow: 0 0 8px rgba(255, 152, 0, 0.6);
        }
        
        /* Punto con círculo interno cuando está lleno */
        .progress-point.filled::after {
          content: '';
          display: block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 3px rgba(255, 255, 255, 0.7);
        }
        
        /* Etiquetas laterales */
        .milestone-label-left, .milestone-label-right {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.8rem;
          font-weight: 700;
          min-width: 24px;
          text-align: center;
          padding: 0 8px;
        }
        
        /* Eliminar el espaciador - ya no es necesario */
        .progress-spacer {
          display: none;
        }

        /* Añadir estilos para las estrellas de hitos especiales */
        .milestone-star-small {
          position: absolute;
          color: #ff9800;
          font-size: 10px;
          font-weight: bold;
          top: -14px;
          text-shadow: 0 0 3px rgba(255, 152, 0, 0.7);
          animation: starPulse 1.5s infinite alternate;
        }
        
        .special-milestone {
          transform: scale(1.12);
        }
        
        @keyframes starPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 1; }
        }

        /* Añadir estilos para el botón de reinicio */
        .reset-streak-container {
          width: 100%;
          margin-top: 20px;
          display: flex;
          justify-content: center;
        }
        
        .reset-streak-btn {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        
        .reset-streak-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }
        
        .reset-streak-btn:active {
          transform: translateY(0);
        }
      `}</style>
      <div className="header-bar">
        <div className="header-bar-inner">
          <img src="/logo.webp" alt="Logo Banco de Alimentos" />
        </div>
      </div>
      {/* Bienvenida animada */}
      <div className="welcome-section">
        <div className="welcome-title">Bienvenido</div>
        <div className="welcome-subtitle">Aliado contra el hambre</div>
      </div>
      <div className="main-flex">
        <div className="main-left">
          {/* Tarjeta de donación */}
          <div className="donacion-card">
            <div className="donacion-desc">
              Tu aporte ayuda a transformar vidas. Elige el tipo y monto de tu donación:
            </div>
            <div className="donacion-btn-group">
              <button
                className={`donacion-btn${tipo === "unica" ? " selected" : ""}`}
                onClick={() => setTipo("unica")}
              >
                <svg fill="none" viewBox="0 0 24 24"><path fill="#ff7300" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                Única vez
              </button>
              <button
                className={`donacion-btn${tipo === "mensual" ? " selected" : ""}`}
                onClick={() => setTipo("mensual")}
              >
                <svg fill="none" viewBox="0 0 24 24"><path fill="#ff7300" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                Mensual
              </button>
            </div>
            <div className="donacion-monto-label">
              Selecciona el monto a donar:
            </div>
            <div className="donacion-montos">
              {[2, 10, 30, 50].map((valor) => (
                <button
                  key={valor}
                  className={`donacion-monto-btn${cantidad === valor && !otroActivo ? " selected" : ""}`}
                  onClick={() => handleCantidad(valor)}
                >
                  USD {valor}
                </button>
              ))}
              <button
                className={`donacion-monto-btn${otroActivo ? " selected" : ""}`}
                onClick={handleOtro}
              >
                Otro valor
              </button>
            </div>
            <div className="donacion-input-row">
              <div className="donacion-input-currency">USD</div>
              <input
                type="number"
                placeholder="Otro"
                value={otroActivo ? otro : ""}
                onFocus={handleOtro}
                onChange={e => {
                  setOtro(e.target.value);
                  setCantidad(Number(e.target.value));
                }}
                className="donacion-input"
                min={otroActivo ? 3 : undefined}
              />
            </div>
            {cantidad === 2 && !otroActivo && (
              <div className="donacion-warning">
                El monto mínimo permitido es USD 3.
              </div>
            )}
            <button 
              className="donar-btn" 
              disabled={cantidad === 2 && !otroActivo}
              onClick={handleDonarClick}
            >
              Donar ahora
              {/* Al hacer clic, se procesará la donación y se actualizará la racha en handleDonarClick */}
            </button>
            {tipo === "mensual" && (
              <div className="impacto-anual">
                <div><strong>Impacto anual estimado:</strong> {animNinios * 12} beneficiarios/año</div>
                <ul style={{margin: '10px 0 0 18px', padding: 0}}>
                  {accionesFundacion.map((accion, i) => (
                    <li key={i}>{accion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* The DonationStreak component is now a popup and not rendered directly in the page flow */}
        </div>
        <div className="main-right">
          {/* Contador de niños beneficiados */}
          <div className="ninios-anim">
            <span>{animNinios}</span>
            <label>{animNinios === 1 ? "persona alimentada" : "personas alimentadas"}</label>
            <div className="ninios-svg-row">
              {ninosArray.map((_, i) => <NinoSVG key={i} />)}
              {ninosExtra > 0 && <span className="ninios-svg-extra">+{ninosExtra}</span>}
            </div>
            {/* Personas alimentadas */}
            <PersonasAlimentadas cantidad={cantidad} />
          </div>
          {/* Sección informativa */}
          <section className="info-section">
            <h2 className="info-title">¿Qué hacemos con tus donaciones?</h2>
            <div className="info-desc">
              Sus contribuciones son utilizadas para <strong>adquirir alimentos de alto valor nutricional</strong> y cubrir la logística que asegure una buena gestión y calidad de los alimentos.
            </div>
            <div className="info-divider"></div>
            <h3 className="info-title2">¿Cómo lo hacemos?</h3>
            <div className="info-desc2">
              Los alimentos gestionados por diferentes fuentes de supermercados, centrales y otros, son complementados con los adquiridos por donaciones y enviados a través de un sistema integral de organizaciones sociales que garantizan trazabilidad y reportería para nuestros benefactores.
            </div>
            <div className="info-block">
              <div style={{textAlign: 'center', marginBottom: 18, color: '#666', fontWeight: 500}}>
                Hace 20 años y con el apoyo de la EPN se fundó el primer Banco de Alimentos del Ecuador como "Banco de Alimentos Quito" y a través de
              </div>
              <ul>
                <li>Programa atención a <strong>Organizaciones Sociales</strong>.</li>
                <li>Programa de atención a <strong>"Familias de Grupos Prioritarios"</strong></li>
                <li>Programa de atención <strong>"Setenta y Piquitos del Adulto Mayor"</strong></li>
                <li>Programa de atención a <strong>"Comedores Escolares Infantiles"</strong></li>
              </ul>
              <div style={{marginTop: 18, color: '#666', fontWeight: 500}}>
                Trabajamos para asegurar que cada dólar invertido en estos programas logre oportunidades reales para el desarrollo de nuestros usuarios y el futuro de nuestro país.
              </div>
            </div>
          </section>
        </div>
      </div>
      {/* Sección inferior con fondo e imágenes */}
      <div className="bottom-section">
        <div className="bottom-section-content">
          <h2>¡Gracias por tu solidaridad!</h2>
          <p>Con tu ayuda, juntos construimos un futuro sin hambre. Cada aporte cuenta y transforma vidas.</p>
        </div>
      </div>
      
      {/* Popup de racha de donaciones integrado */}
      <AnimatePresence>
        {showPopup && popupPhase !== 'minimized' && (
          <DonationStreakPopup 
            streakData={streakData}
            popupPhase={popupPhase}
            loadingProgress={loadingProgress}
            handleClosePopup={handleClosePopup}
            resetStreak={resetStreak}
            showConfetti={showConfetti}
            streakAnimating={streakAnimating}
            confettiRef={confettiRef}
            donationHistory={donationHistory}
            getCelebrationMessage={getCelebrationMessage}
          />
        )}
        
        {/* Versión minimizada del popup */}
        {showPopup && popupPhase === 'minimized' && (
          <DonationStreakMinimized 
            streakData={streakData}
            handleTogglePopup={handleTogglePopup}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente animado de personas alimentadas
function PersonasAlimentadas({ cantidad }: { cantidad: number }) {
  const [personas, setPersonas] = React.useState(cantidad);
  React.useEffect(() => {
    let start = personas;
    let end = cantidad;
    if (start === end) return;
    const step = start < end ? 1 : -1;
    const interval = setInterval(() => {
      setPersonas((prev) => {
        if (prev === end) {
          clearInterval(interval);
          return prev;
        }
        return prev + step;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [cantidad, personas]);
  return (
    <div className="platos-section">
      <div className="platos-num">{personas}</div>
      <div className="platos-label">{personas === 1 ? 'persona alimentada' : 'personas alimentadas'}</div>
      <div style={{ fontSize: '1rem', color: '#b85c00', marginTop: 2 }}>Con un solo $1 alimentas a una persona durante todo un día.</div>
    </div>
  );
} 