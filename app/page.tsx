import { ComicForm } from '@/components/form/ComicForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
      {/* Hero header */}
      <div className="text-center pt-12 pb-8 px-4">
        <h1
          className="font-black uppercase tracking-widest text-gray-900 mb-2"
          style={{
            fontFamily: 'Impact, Haettenschweiler, sans-serif',
            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
            textShadow: '4px 4px 0 #e63946',
            letterSpacing: '0.08em',
          }}
        >
          COMIC BUILDER
        </h1>
        <p className="text-gray-600 text-lg">
          Turn your ideas (and your face!) into a real comic book
        </p>
      </div>

      {/* Form card */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <ComicForm />
        </div>
      </div>
    </main>
  )
}
