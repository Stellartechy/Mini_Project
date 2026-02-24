import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class FaceDetector {
    constructor() {
        this.faceLandmarker = null;
        this.runningMode = "VIDEO";
        this.lastVideoTime = -1;
    }

    async initialize() {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true, // Key for head pose
            runningMode: this.runningMode,
            numFaces: 1
        });
    }

    detect(videoElement, timestamp) {
        if (!this.faceLandmarker) return null;

        if (timestamp !== this.lastVideoTime) {
            this.lastVideoTime = timestamp;
            const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
            return this.processResults(results);
        }
        return null;
    }

    processResults(results) {
        if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
            return null;
        }

        const landmarks = results.faceLandmarks[0];
        const matrix = results.facialTransformationMatrixes
            ? results.facialTransformationMatrixes[0].data
            : null;

        // Calculate EAR
        const leftEAR = this.calculateEAR(landmarks, [33, 160, 158, 133, 153, 144]);
        const rightEAR = this.calculateEAR(landmarks, [362, 385, 387, 263, 373, 380]);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // Calculate Head Pose (Euler Angles from Matrix)
        let pitch = 0, yaw = 0, roll = 0;
        if (matrix) {
            // MediaPipe matrix is 4x4 flattened. Truncate to 3x3 rotation
            // [R00, R01, R02, T0]
            // [R10, R11, R12, T1] ...
            // Row-major? 
            // Documentation says: 4x4 row-major.

            // Rotation Matrix R:
            // R00 = matrix[0], R01 = matrix[1], R02 = matrix[2]
            // R10 = matrix[4], R11 = matrix[5], ...
            // R20 = matrix[8], ...

            // Pitch (X-axis rotation) = atan2(R21, R22)
            // Yaw (Y-axis rotation) = atan2(-R20, sqrt(R21^2 + R22^2))
            // Roll (Z-axis rotation) = atan2(R10, R00)

            const r00 = matrix[0], r01 = matrix[1], r02 = matrix[2];
            const r10 = matrix[4], r11 = matrix[5], r12 = matrix[6];
            const r20 = matrix[8], r21 = matrix[9], r22 = matrix[10];

            // Convert to degrees
            // Note: Axes definitions might vary. 
            // Usually: 
            // Pitch: rotation around x
            // Yaw: rotation around y

            // Logic engine expects:
            // Pitch < -10 is Down.
            // Yaw > 45 is side.

            const sy = Math.sqrt(r00 * r00 + r10 * r10);
            const singular = sy < 1e-6;

            if (!singular) {
                pitch = Math.atan2(r21, r22);
                yaw = Math.atan2(-r20, sy);
                roll = Math.atan2(r10, r00);
            } else {
                pitch = Math.atan2(-r12, r11);
                yaw = Math.atan2(-r20, sy);
                roll = 0;
            }

            // Convert rad to deg
            pitch = pitch * (180 / Math.PI);
            yaw = yaw * (180 / Math.PI);

            // Adjust for MediaPipe Coordinate system if needed.
            // Empirically, Pitch down is often negative.
        }

        return {
            ear: avgEAR,
            pitch: pitch,
            yaw: yaw,
            landmarks: landmarks
        };
    }

    calculateEAR(landmarks, indices) {
        // indices: [p1, p2, p3, p4, p5, p6]
        // EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
        const p1 = landmarks[indices[0]];
        const p2 = landmarks[indices[1]];
        const p3 = landmarks[indices[2]];
        const p4 = landmarks[indices[3]];
        const p5 = landmarks[indices[4]];
        const p6 = landmarks[indices[5]];

        const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

        // MediaPipe landmarks are normalized [0,1]. Aspect ratio might matter if image is not square?
        // Usually fine for relative comparison.

        const num = dist(p2, p6) + dist(p3, p5);
        const den = 2 * dist(p1, p4);

        if (den === 0) return 0;
        return num / den;
    }
}
