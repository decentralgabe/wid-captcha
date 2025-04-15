import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Confetti } from "./confetti"

// Rest of the code remains the same...

export default function CongratulationsPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      {/* Add the Confetti component */}
      <Confetti />

      {/* Marquee banner */}
      <div className="w-full overflow-hidden bg-gradient-to-r from-green-400 to-blue-500 text-white py-3 mb-8 rounded-lg shadow-lg">
        <div className="marquee-content">
          <span className="text-xl font-bold">🎉 CONGRATS ON BEING A HUMAN! 🎉</span>
        </div>
      </div>

      {/* Rest of the component remains the same... */}
      <Card className="w-full max-w-md bg-white rounded-lg shadow-lg">
        <CardContent className="p-8 flex flex-col items-center">
          <Image src="/human.png" alt="Congratulations" width={200} height={200} className="mb-4 rounded-full" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Congratulations!</h1>
          <p className="text-gray-700 text-center mb-6">
            You have successfully proven that you are a human. Welcome to the club!
          </p>
          <p className="text-sm text-gray-500 text-center">We are happy to have you. Enjoy your stay!</p>
        </CardContent>
      </Card>
    </div>
  )
}
