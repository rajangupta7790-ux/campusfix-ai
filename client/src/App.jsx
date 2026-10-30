import { useEffect, useState } from 'react'
import api from './services/api'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/health')
      .then((res) => setHealth(res.data.data))
      .catch(() => setError('Cannot reach the backend'))
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-blue-600">CampusFix AI</h1>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {health && (
        <p className="mt-4 text-green-700">
          Backend: {health.status} | Database: {health.database}
        </p>
      )}
    </div>
  )
}

export default App