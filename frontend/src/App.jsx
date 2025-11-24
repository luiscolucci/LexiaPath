import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  // --- ESTADOS DE DADOS ---
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DE ACESSIBILIDADE ---
  const [fontSize, setFontSize] = useState(18); // Tamanho padrão
  const [useLexend, setUseLexend] = useState(false); // Fonte especial
  const [highContrast, setHighContrast] = useState(false); // Modo escuro

  // --- ESTADOS DE ÁUDIO & INTERATIVIDADE ---
  const [isSpeakingMain, setIsSpeakingMain] = useState(false);
  const [isSpeakingAnswer, setIsSpeakingAnswer] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false); // Controla o spoiler

  // Efeito: Aplica classe de alto contraste no corpo do site
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }
  }, [highContrast]);

  // Efeito: Para o áudio se sair da página
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // --- LÓGICA DE SEPARAÇÃO DO TEXTO (SPOILER) ---
  const getParts = (fullText) => {
    if (!fullText) return { main: "", answer: "", hasHiddenAnswer: false };

    // Procura o padrão >! Texto !<
    const spoilerMatch = fullText.match(/>!([\s\S]*?)!</);

    if (spoilerMatch) {
      return {
        // Remove o spoiler do texto principal e coloca um aviso
        main: fullText.replace(
          />![\s\S]*?!</,
          "\n\n> *🛑 Pense na resposta... depois clique no botão abaixo para conferir!*"
        ),
        // Guarda a resposta para mostrar no cartão depois
        answer: spoilerMatch[1].trim(),
        hasHiddenAnswer: true,
      };
    }
    return { main: fullText, answer: "", hasHiddenAnswer: false };
  };

  // --- GERENCIADOR DE ÁUDIO ---
  const speakText = (text, activeStateSetter) => {
    window.speechSynthesis.cancel();
    setIsSpeakingMain(false);
    setIsSpeakingAnswer(false);

    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1.1;
    utterance.pitch = 1;

    utterance.onend = () => activeStateSetter(false);
    window.speechSynthesis.speak(utterance);
    activeStateSetter(true);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeakingMain(false);
    setIsSpeakingAnswer(false);
  };

  const handleSpeakMain = () => {
    if (isSpeakingMain) {
      handleStop();
      return;
    }
    const parts = getParts(result);
    speakText(parts.main, setIsSpeakingMain);
  };

  const handleSpeakAnswer = () => {
    if (isSpeakingAnswer) {
      handleStop();
      return;
    }
    const parts = getParts(result);
    if (parts.answer) {
      speakText("A resposta correta é: " + parts.answer, setIsSpeakingAnswer);
    }
  };

  const resetStates = () => {
    setResult("");
    handleStop();
    setShowAnswer(false); // Esconde a resposta ao gerar novo conteúdo
  };

  // --- CONEXÃO COM API ---
  const handleSimplify = async () => {
    if (!inputText) return;
    setLoading(true);
    resetStates();
    try {
      const response = await fetch("http://localhost:8000/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_text: inputText }),
      });
      const data = await response.json();
      setResult(data.simplified_text);
    } catch (error) {
      console.error(error);
      setResult("Erro na API.");
    }
    setLoading(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    resetStates();
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("http://localhost:8000/upload-pdf", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Erro upload");
      const data = await response.json();
      setResult(data.simplified_text);
    } catch (error) {
      console.error(error);
      setResult("Erro ao ler PDF.");
    }
    setLoading(false);
  };

  // Prepara os textos para renderizar
  const { main, answer, hasHiddenAnswer } = getParts(result);

  return (
    <div className={`wrapper ${useLexend ? "font-lexend" : ""}`}>
      <div className="container">
        <header>
          <h1>🧠 LexiaPath</h1>
          <p>Ensino estruturado e multisensorial.</p>
        </header>

        <main>
          <div className="input-area">
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
              <span className="upload-hint">ou cole o texto:</span>
            </div>
            <textarea
              placeholder="Cole o conteúdo..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
            />
            <button
              className="action-btn"
              onClick={handleSimplify}
              disabled={loading}
            >
              {loading ? "Preparando Aula..." : "✨ Gerar Aula Interativa"}
            </button>
          </div>

          {result && (
            <div className="result-container">
              {/* 1. BARRA DE FERRAMENTAS DE ACESSIBILIDADE */}
              <div className="accessibility-bar">
                <div className="tool-group">
                  <button
                    className="tool-btn"
                    onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                    title="Diminuir Texto"
                  >
                    A-
                  </button>
                  <button
                    className="tool-btn"
                    onClick={() => setFontSize((s) => Math.min(32, s + 2))}
                    title="Aumentar Texto"
                  >
                    A+
                  </button>
                </div>
                <div className="tool-group">
                  <button
                    className={`tool-btn ${useLexend ? "active" : ""}`}
                    onClick={() => setUseLexend(!useLexend)}
                  >
                    {useLexend ? "Fonte: Lexend" : "Fonte: Padrão"}
                  </button>
                </div>
                <div className="tool-group">
                  <button
                    className={`tool-btn ${highContrast ? "active" : ""}`}
                    onClick={() => setHighContrast(!highContrast)}
                  >
                    {highContrast ? "☀️ Dia" : "🌙 Noite"}
                  </button>
                </div>
              </div>

              {/* Área de Resultado Dinâmica */}
              <div
                className="result-area"
                style={{ fontSize: `${fontSize}px` }}
              >
                {/* 2. CONTROLES DE ÁUDIO */}
                <div className="audio-controls">
                  <button
                    onClick={handleSpeakMain}
                    className={`speak-btn ${isSpeakingMain ? "speaking" : ""}`}
                  >
                    {isSpeakingMain ? "⏹️ Parar" : "🗣️ Ouvir Aula"}
                  </button>

                  {/* Botão de ouvir resposta só aparece se ela já foi revelada */}
                  {hasHiddenAnswer && showAnswer && (
                    <button
                      onClick={handleSpeakAnswer}
                      className={`speak-btn answer-btn ${
                        isSpeakingAnswer ? "speaking" : ""
                      }`}
                    >
                      {isSpeakingAnswer ? "⏹️ Parar" : "🎓 Ouvir Resposta"}
                    </button>
                  )}
                </div>

                {/* 3. TEXTO DA AULA */}
                <ReactMarkdown>{main}</ReactMarkdown>

                {/* 4. SEÇÃO DE RESPOSTA INTERATIVA (SPOILER) */}
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
                          Esconder novamente
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
