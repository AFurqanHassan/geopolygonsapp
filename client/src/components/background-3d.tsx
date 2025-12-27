import React from "react";
import { motion } from "framer-motion";

export function Background3D() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden bg-[#0a1128]/40">
      {/* Moving Light Beams - Higher visibility */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`beam-${i}`}
          className="absolute w-[800px] h-[3px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent blur-md"
          style={{
            top: `${10 + i * 20}%`,
            left: "-50%",
            transform: "rotate(-35deg)",
          }}
          animate={{
            x: ["-20%", "150%"],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            delay: i * 2,
            ease: "linear",
          }}
        />
      ))}

      {/* 3D Grid Layer with Glow - Higher Opacity */}
      <div className="absolute inset-0" style={{ perspective: "1000px" }}>
        <motion.div
          className="absolute inset-0"
          initial={{ rotateX: 65, y: "-10%" }}
          animate={{
            y: ["0%", "-10%"],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(59, 130, 246, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(59, 130, 246, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            transformOrigin: "center top",
            width: "300%",
            height: "300%",
            left: "-100%",
            top: "0",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent" />
        </motion.div>
      </div>

      {/* Depth Particles - More visible */}
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={`part-${i}`}
          className="absolute rounded-full bg-blue-400/30 blur-sm"
          style={{
            width: Math.random() * 6 + 2,
            height: Math.random() * 6 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            z: [0, 600],
            opacity: [0, 0.9, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 8,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
