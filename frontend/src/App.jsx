import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

function App() {
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Controle dos botões de áudio
  const [isSpeakingMain, setIsSpeakingMain] = useState(false)
  const [isSpeakingAnswer, setIsSpeakingAnswer] = useState(false)

  // NOVO ESTADO: Controla se a resposta visual está visível ou não
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // --- LÓGICA DE SEPARAÇÃO (ÁUDIO E TEXTO) ---
  const getParts = (fullText) => {
    if (!fullText) return { main: "", answer: "", hasHiddenAnswer: false };

    const spoilerMatch = fullText.match(/>!([\s\S]*?)!</);
    
    if (spoilerMatch) {
      return {
        // Texto principal: Substitui o spoiler por uma instrução visual simples
        main: fullText.replace(/>![\s\S]*?!</, "\n\n> *Pense na resposta... depois clique no botão abaixo para conferir!*"),
        answer: spoilerMatch[1].trim(),
        hasHiddenAnswer: true
      };
    }
    return { main: fullText, answer: "", hasHiddenAnswer: false };
  };

  // --- ÁUDIO ---
  const speakText = (text, activeStateSetter) => {
    window.speechSynthesis.cancel();
    setIsSpeakingMain(false);
    setIsSpeakingAnswer(false);

    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1;
    utterance.pitch = 1;

    utterance.onend = () => activeStateSetter(false);
    window.speechSynthesis.speak(utterance);
    activeStateSetter(true);
  }

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeakingMain(false);
    setIsSpeakingAnswer(false);
  }

  const handleSpeakMain = () => {
    if (isSpeakingMain) { handleStop(); return; }
    const parts = getParts(result);
    // Para áudio, lemos a versão sem o texto do spoiler
    speakText(parts.main, setIsSpeakingMain);
  }

  const handleSpeakAnswer = () => {
    if (isSpeakingAnswer) { handleStop(); return; }
    const parts = getParts(result);
    if (parts.answer) {
      speakText("A resposta correta é: " + parts.answer, setIsSpeakingAnswer);
    }
  }

  // --- RESET DE ESTADOS ---
  const resetStates = () => {
    setResult('');
    handleStop();
    setShowAnswer(false); // Esconde a resposta sempre que gerar nova aula
  }

  // --- API ---
  const handleSimplify = async () => {
    if (!inputText) return;
    setLoading(true);
    resetStates();
    
    try {
      const response = await fetch('http://localhost:8000/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_text: inputText })
      });
      const data = await response.json();
      setResult(data.simplified_text);
    } catch (error) {
      console.error(error);
      setResult("Erro na API.");
    }
    setLoading(false);
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    resetStates();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Erro upload');
      const data = await response.json();
      setResult(data.simplified_text);
    } catch (error) {
      console.error(error);
      setResult("Erro ao ler PDF.");
    }
    setLoading(false);
  }

  // Prepara as partes para renderização
  const { main, answer, hasHiddenAnswer } = getParts(result);

  return (
    <div className="wrapper">
      <div className="container">
        <header>
          <h1>🧠 LexiaPath</h1>
          <p>Ensino estruturado e multisensorial.</p>
        </header>

        <main>
          <div className="input-area">
            <div className="file-upload-wrapper">
              <label htmlFor="pdf-upload" className="upload-btn">📄 Escolher PDF</label>
              <input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileUpload} disabled={loading}/>
              <span className="upload-hint">ou cole o texto:</span>
            </div>

            <textarea 
              placeholder="Cole o conteúdo da aula aqui..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
            />
            
            <button className="action-btn" onClick={handleSimplify} disabled={loading}>
              {loading ? 'Preparando Aula...' : '✨ Gerar Aula Interativa'}
            </button>
          </div>

          {result && (
            <div className="result-area">
              
              {/* Botões de Áudio (Controle Geral) */}
              <div className="audio-controls">
                <button 
                  onClick={handleSpeakMain} 
                  className={`speak-btn ${isSpeakingMain ? 'speaking' : ''}`}
                >
                  {isSpeakingMain ? '⏹️ Parar' : '🗣️ Ouvir Aula'}
                </button>
                
                {/* O botão de Ouvir Resposta só aparece se o usuário já revelou visualmente a resposta */}
                {hasHiddenAnswer && showAnswer && (
                  <button 
                    onClick={handleSpeakAnswer} 
                    className={`speak-btn answer-btn ${isSpeakingAnswer ? 'speaking' : ''}`}
                  >
                    {isSpeakingAnswer ? '⏹️ Parar' : '🎓 Ouvir Resposta'}
                  </button>
                )}
              </div>
              
              {/* Texto Principal da Aula */}
              <ReactMarkdown>{main}</ReactMarkdown>

              {/* ÁREA DA RESPOSTA INTERATIVA */}
              {hasHiddenAnswer && (
                <div className="interactive-answer-section">
                  {!showAnswer ? (
                    <button 
                      className="reveal-btn" 
                      onClick={() => setShowAnswer(true)}
                    >
                      👁️ Exibir Resposta
                    </button>
                  ) : (
                    <div className="answer-card fade-in">
                      <h3>🎉 Resposta do Desafio:</h3>
                      <p>{answer}</p>
                      <button 
                        className="hide-btn"
                        onClick={() => setShowAnswer(false)}
                      >
                        Esconder
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
