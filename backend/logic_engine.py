import time

class DrowsinessDetector:
    def __init__(self):
        # Configurable Thresholds
        self.EAR_THRESHOLD = 0.25        # Eyes considered closed if EAR < this
        self.EYE_CLOSED_TIME = 2.0       # Seconds to trigger drowsy
        self.HEAD_PITCH_DOWN = -10       # Degrees. < -10 means looking down
        self.HEAD_YAW_LIMIT = 45         # Degrees. > 45 means looking side (ignore)
        
        # State
        self.eye_closed_start_time = None
        self.current_state = "SAFE"      # SAFE, WARNING, DROWSY
        self.last_update_time = time.time()
        
    def process_frame(self, data):
        """
        Process incoming features.
        data schema: {
            "ear": float,
            "pitch": float, # head pitch (up/down)
            "yaw": float,   # head yaw (left/right)
            "timestamp": float
        }
        """
        ear = data.get("ear", 1.0)
        pitch = data.get("pitch", 0.0)
        yaw = data.get("yaw", 0.0)
        
        # 1. Check for distracted/side look
        if abs(yaw) > self.HEAD_YAW_LIMIT:
            self.reset_state(reason="Head rotation active")
            return self.get_status(ear, pitch, yaw, "SAFE (Looking Side)")

        # 2. Check logic
        is_eyes_closed = ear < self.EAR_THRESHOLD
        is_nodding = pitch < self.HEAD_PITCH_DOWN
        
        now = time.time()
        
        if is_eyes_closed:
            if self.eye_closed_start_time is None:
                self.eye_closed_start_time = now
            
            duration = now - self.eye_closed_start_time
            
            # Additional check: If nodding AND eyes closed, trigger faster?
            # User requirement: "Only trigger alerts when EAR stays low > 2 seconds"
            # But also: "Detect head-nodding... + eyes partially or fully closed"
            # We will stick to the 2s rule for eyes, or immediate if combined with deep nod?
            # Let's enforce the 2s rule for pure eye closure. 
            
            if duration > self.EYE_CLOSED_TIME:
                self.current_state = "DROWSY"
            elif duration > 0.5 * self.EYE_CLOSED_TIME:
                self.current_state = "WARNING"
            else:
                self.current_state = "SAFE"
                
            if is_nodding and duration > 1.0: # If nodding + eyes closed for > 1s
                 self.current_state = "DROWSY"
                 
        else:
            # Eyes open
            self.eye_closed_start_time = None
            if is_nodding:
                 # Nodding but eyes open - maybe checking dashboard? 
                 # User says: "slow involuntary head-nodding... (microsleep pattern)"
                 # Usually microsleep involves eye closure.
                 self.current_state = "WARNING"
            else:
                self.current_state = "SAFE"

        return self.get_status(ear, pitch, yaw, self.current_state)

    def reset_state(self, reason):
        self.eye_closed_start_time = None
        self.current_state = "SAFE"
        
    def get_status(self, ear, pitch, yaw, state_label):
        return {
            "state": state_label, # SAFE, WARNING, DROWSY
            "ear": round(ear, 3),
            "pitch": round(pitch, 1),
            "yaw": round(yaw, 1),
            "is_alert": state_label == "DROWSY"
        }
