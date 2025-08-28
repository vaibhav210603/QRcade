import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Controller from './pages/Controller/Controller'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        <Controller></Controller>
    </>
  )
}

export default App
