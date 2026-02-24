import React, { useEffect, useRef, useState } from "react";
import { FaceDetector } from "../detector";

const VideoFeed = ({ onData }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [detector, setDetector] = useState(null);
    const requestRef = useRef();

    useEffect(() => {
        const initDetector = async () => {
            const d = new FaceDetector();
            await d.initialize();
            setDetector(d);
        };
        initDetector();
    }, []);

    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
                .then((stream) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play();
                    }
                });
        }
    }, []);

    const draw = () => {
        if (!videoRef.current || !canvasRef.current || !detector) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState !== 4) {
            requestRef.current = requestAnimationFrame(draw);
            return;
        }

        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Detect
        const result = detector.detect(video, performance.now());

        // Draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result) {
            // Draw Mesh
            const landmarks = result.landmarks;
            ctx.fillStyle = "#00ffcc";

            // Draw eyes only for aesthetic minimal look? Or full face?
            // User asked for "Modern, aesthetic... Clean minimal design"
            // Let's draw subtle dots for eyes and face contour

            for (let i = 0; i < landmarks.length; i += 5) { // Skip some for performance/aesthetics
                const x = landmarks[i].x * canvas.width;
                const y = landmarks[i].y * canvas.height;
                ctx.fillRect(x, y, 1, 1);
            }

            // Callback with data
            if (onData) {
                onData({
                    ear: result.ear,
                    pitch: result.pitch,
                    yaw: result.yaw,
                    timestamp: Date.now() / 1000
                });
            }
        } else {
            // Even if no face, we might want to send heartbeat?
        }

        requestRef.current = requestAnimationFrame(draw);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(requestRef.current);
    }, [detector]);

    return (
        <div className="video-container">
            <video ref={videoRef} style={{ display: "none" }} playsInline muted />
            <canvas
                ref={canvasRef}
                className="video-canvas"
            />
        </div>
    );
};

export default VideoFeed;
