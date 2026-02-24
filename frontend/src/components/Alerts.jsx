import React, { useEffect, useRef } from 'react';

const Alerts = ({ isAlert }) => {
    const audioCtxRef = useRef(null);

    const playBeep = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;

        // Create oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    };

    useEffect(() => {
        let interval;
        if (isAlert) {
            playBeep();
            interval = setInterval(playBeep, 800); // Repeat beep

            // Vibration if supported
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
        }
        return () => clearInterval(interval);
    }, [isAlert]);

    return null; // Invisible component
};

export default Alerts;
