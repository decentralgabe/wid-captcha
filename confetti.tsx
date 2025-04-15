"use client"

import { useEffect, useState } from "react"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  speed: number
  angle: number
}

export function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    // Create confetti particles
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"]
    const newParticles: Particle[] = []

    for (let i = 0; i < 100; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 100,
        size: 5 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 2 + Math.random() * 3,
        angle: -0.5 + Math.random(),
      })
    }

    setParticles(newParticles)

    // Animation loop
    const interval = setInterval(() => {
      setParticles((prevParticles) =>
        prevParticles.map((particle) => {
          // Update particle position
          const x = particle.x + particle.angle * 2
          const y = particle.y + particle.speed

          // Reset particle if it goes off screen
          if (y > window.innerHeight) {
            return {
              ...particle,
              x: Math.random() * window.innerWidth,
              y: -20,
              size: 5 + Math.random() * 10,
              speed: 2 + Math.random() * 3,
              angle: -0.5 + Math.random(),
            }
          }

          return { ...particle, x, y }
        }),
      )
    }, 30)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
          }}
        />
      ))}
    </div>
  )
}
