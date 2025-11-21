import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

function App() {
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Efeito para cancelar a fala se o componente for desmontado (fechar aba/atualizar)
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // --- FUNÇÃO DE ÁUDIO (TTS) ---
  const handleSpeak = () => {
    if (!result) return;

    // Se já estiver falando, cancela (funciona como Pause/Stop)
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Configura a voz do navegador
    const utterance = new SpeechSynthesisUtterance(result);
    utterance.lang = 'pt-BR'; // Força português do Brasil
    utterance.rate = 1.1;     // Velocidade levemente mais rápida para fluidez
    utterance.pitch = 1;

    // Quando a leitura terminar, reseta o botão
    utterance.onend = () => setIsSpeaking(false);
    
    // Inicia a fala
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  // --- CHAMADA AO BACKEND (TEXTO) ---
  const handleSimplify = async () => {
    if (!inputText) return;
    
    setLoading(true);
    setResult(''); // Limpa resultado anterior
    
    try {
      const response = await fetch('http://localhost:8000/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_text: inputText })
      });
      
      const data = await response.json();
      setResult(data.simplified_text);
    } catch (error) {
      console.error("Erro ao conectar com a API", error);
      setResult("Ocorreu um erro ao tentar gerar a aula. Verifique se o backend está rodando.");
    }
    setLoading(false);
  }

  // --- CHAMADA AO BACKEND (UPLOAD PDF) ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setResult(''); // Limpa resultado anterior

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload-pdf', {
        method: 'POST',
        body: formData, // O browser define o Content-Type multipart/form-data automaticamente
      });
      
      if (!response.ok) throw new Error('Erro no upload');
      
      const data = await response.json();
      setResult(data.simplified_text);
    } catch (error) {
      console.error(error);
      setResult("Erro ao processar o PDF. Verifique se o arquivo é válido e contém texto selecionável.");
    }
    setLoading(false);
  }

  return (
    <div className="wrapper">
      <div className="container">
        <header>
          <h1>🧠 LexiaPath</h1>
          <p>Sua plataforma de ensino adaptativo multisensorial.</p>
        </header>

        <main>
          <div className="input-area">
            
            {/* Área de Upload */}
            <div className="file-upload-wrapper">
              <label htmlFor="pdf-upload" className="upload-btn">
                📄 Escolher PDF
              </label>
              <input 
                id="pdf-upload" 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload} 
                disabled={loading}
              />
              <span className="upload-hint">ou cole o texto abaixo:</span>
            </div>

            <textarea 
              placeholder="Cole o conteúdo difícil aqui..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
            />
            
            <button className="action-btn" onClick={handleSimplify} disabled={loading}>
              {loading ? 'Preparando a Aula...' : '✨ Gerar Aula Adaptada'}
            </button>
          </div>

          {result && (
            <div className="result-area">
              {/* Controles de Áudio */}
              <div className="audio-controls">
                <button 
                  onClick={handleSpeak} 
                  className={`speak-btn ${isSpeaking ? 'speaking' : ''}`}
                  title="Ouvir o conteúdo gerado"
                >
                  {isSpeaking ? '⏹️ Parar Leitura' : '🗣️ Ouvir a Aula'}
                </button>
              </div>
              
              {/* Renderização do Markdown (Aula Estruturada) */}
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
