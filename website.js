import React, { useState, useRef } from 'react';

const App = () => {
    const [inputText, setInputText] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [misinformationFact, setMisinformationFact] = useState(null);
    const [isGettingFact, setIsGettingFact] = useState(false);
    const resultsRef = useRef(null);

    const analyzeContent = async () => {
        if (!inputText.trim()) {
            setError('Please enter some text to analyze.');
            return;
        }

        setLoading(true);
        setResults(null);
        setError(null);

        const systemPrompt = `
            You are a world-class misinformation expert and digital literacy educator. Your task is to analyze the provided text for factual accuracy, manipulative tactics, and credibility.

            The user will provide a piece of text. You will respond with a structured JSON object.

            The JSON object MUST have two properties:
            1.  'credibilityScore': An integer from 0 to 100, where 100 is perfectly credible and 0 is completely false or misleading.
            2.  'breakdown': A detailed, plain-language explanation (in English) of your analysis. This should explain WHY the content is credible or not, pointing out specific elements like factual errors, emotional appeals, logical fallacies, or out-of-context information. Your goal is to educate the user on how to spot these issues themselves. Do not just state a score; justify it. The breakdown should be at least two paragraphs long.
            
            Here is the text to analyze:
            "${inputText}"
        `;

        const payload = {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "credibilityScore": { "type": "NUMBER" },
                        "breakdown": { "type": "STRING" }
                    },
                    "propertyOrdering": ["credibilityScore", "breakdown"]
                }
            },
            tools: [{ "google_search": {} }]
        };

        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 1000;

        const makeApiCall = async () => {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!jsonText) {
                    throw new Error('Invalid API response structure.');
                }
                
                const parsedResult = JSON.parse(jsonText);
                setResults(parsedResult);

                setTimeout(() => {
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);

            } catch (e) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    const delay = baseDelay * (2 ** retryCount);
                    setTimeout(makeApiCall, delay);
                } else {
                    console.error('Final API call failed after retries:', e);
                    setError('Failed to get a response. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        makeApiCall();
    };
    
    const summarizeContent = async () => {
      if (!inputText.trim()) {
            setError('Please enter some text to summarize.');
            return;
        }

      setIsSummarizing(true);
      setSummary(null);

      const systemPrompt = `
        Summarize the following text in a clear, concise paragraph of no more than 100 words.
        Text to summarize:
        "${inputText}"
      `;

      const payload = {
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: "text/plain",
        },
      };

      let retryCount = 0;
      const maxRetries = 3;
      const baseDelay = 1000;

      const makeApiCall = async () => {
          try {
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              });

              if (!response.ok) {
                  throw new Error(`API error: ${response.status} ${response.statusText}`);
              }

              const result = await response.json();
              const summaryText = result.candidates?.[0]?.content?.parts?.[0]?.text;
              
              setSummary(summaryText);
          } catch (e) {
              if (retryCount < maxRetries) {
                  retryCount++;
                  const delay = baseDelay * (2 ** retryCount);
                  setTimeout(makeApiCall, delay);
              } else {
                  console.error('Final API call failed after retries:', e);
                  setError('Failed to get a summary. Please try again.');
              }
          } finally {
              setIsSummarizing(false);
          }
      };
      
      makeApiCall();
    };

    const getMisinformationFact = async () => {
      setIsGettingFact(true);
      setMisinformationFact(null);
      setError(null);

      const prompt = "Provide a single, interesting, and easy-to-understand 'Did you know?' style fact about misinformation, media literacy, or cognitive biases that lead to believing false information.";
      
      const payload = {
          contents: [{ parts: [{ text: prompt }] }],
      };

      let retryCount = 0;
      const maxRetries = 3;
      const baseDelay = 1000;

      const makeApiCall = async () => {
          try {
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              });

              if (!response.ok) {
                  throw new Error(`API error: ${response.status} ${response.statusText}`);
              }

              const result = await response.json();
              const factText = result.candidates?.[0]?.content?.parts?.[0]?.text;
              
              setMisinformationFact(factText);
          } catch (e) {
              if (retryCount < maxRetries) {
                  retryCount++;
                  const delay = baseDelay * (2 ** retryCount);
                  setTimeout(makeApiCall, delay);
              } else {
                  console.error('Final API call failed after retries:', e);
                  setError('Failed to get a fact. Please try again.');
              }
          } finally {
              setIsGettingFact(false);
          }
      };

      makeApiCall();
    };


    const getCredibilityBarColor = (score) => {
        if (score > 70) return 'bg-green-500';
        if (score > 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getScoreText = (score) => {
        if (score > 90) return 'Extremely Credible';
        if (score > 70) return 'Highly Credible';
        if (score > 50) return 'Moderately Credible';
        if (score > 30) return 'Potentially Misleading';
        return 'Highly Misleading';
    };

    return (
        <div className="bg-gray-100 min-h-screen p-8 flex justify-center items-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl border border-gray-200">
                <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-2">SĀJĀG</h1>
                <p className="text-center text-gray-500 mb-8">Your AI-powered misinformation detector.</p>
                
                <div className="space-y-6">
                    <div>
                        <label htmlFor="input-text" className="block text-sm font-medium text-gray-700 mb-2">
                            Paste text to analyze:
                        </label>
                        <textarea
                            id="input-text"
                            rows="6"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="e.g., 'A new study reveals that eating chocolate every day can extend your lifespan by 10 years.'"
                        ></textarea>
                    </div>

                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                        <button
                            onClick={analyzeContent}
                            disabled={loading}
                            className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-full text-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {loading && (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
                        </button>
                        <button
                            onClick={summarizeContent}
                            disabled={isSummarizing || !inputText.trim()}
                            className="w-full py-3 px-6 bg-gray-600 text-white font-bold rounded-full text-lg hover:bg-gray-700 transition-colors duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {isSummarizing && (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            <span>{isSummarizing ? 'Summarizing...' : 'Summarize Content ✨'}</span>
                        </button>
                    </div>

                    {error && <div className="text-red-500 text-center mt-4">{error}</div>}
                </div>

                {summary && (
                  <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Summary</h2>
                    <p className="text-gray-600 leading-relaxed italic whitespace-pre-wrap">
                      {summary}
                    </p>
                  </div>
                )}

                {results && (
                    <div ref={resultsRef} className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Analysis Results</h2>
                        <div className="mb-4">
                            <h3 className="text-xl font-semibold text-gray-700">Credibility Score:</h3>
                            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden mt-2">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-in-out ${getCredibilityBarColor(results.credibilityScore)}`}
                                    style={{ width: `${results.credibilityScore}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                                <span>{getScoreText(results.credibilityScore)}</span>
                                <span>{results.credibilityScore}/100</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-gray-700">The Breakdown:</h3>
                            <p className="text-gray-600 mt-2 leading-relaxed italic whitespace-pre-wrap">
                                {results.breakdown}
                            </p>
                        </div>
                    </div>
                )}
                
                <div className="mt-8 flex justify-center">
                  <button
                      onClick={getMisinformationFact}
                      disabled={isGettingFact}
                      className="py-3 px-6 bg-purple-600 text-white font-bold rounded-full text-lg hover:bg-purple-700 transition-colors duration-300 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                      {isGettingFact && (
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                      )}
                      <span>{isGettingFact ? 'Getting Fact...' : 'Get Misinformation Fact ✨'}</span>
                  </button>
                </div>

                {misinformationFact && (
                  <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
                    <h3 className="text-xl font-semibold text-gray-700">Did you know?</h3>
                    <p className="text-gray-600 mt-2 leading-relaxed italic">
                      {misinformationFact}
                    </p>
                  </div>
                )}
            </div>
        </div>
    );
};

export default App;
