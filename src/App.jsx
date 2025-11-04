import React, { useState, useMemo, useRef, useEffect } from "react";

/**
 * SARAスコア簡易スコアラー
 * - 項目ごとにスコア範囲が異なる
 * - 合計をリアルタイム表示
 * - CSVエクスポート対応
 */

const FORM_ITEMS = [
  { id: "1", label: "歩行", max: 8 },
  { id: "2", label: "立位", max: 6 },
  { id: "3", label: "座位", max: 4 },
  { id: "4", label: "言語機能", max: 6 },
  { id: "5", label: "指の追跡運動", max: 4 },
  { id: "6", label: "鼻指試験", max: 4 },
  { id: "7", label: "手の回内回外運動", max: 4 },
  { id: "8", label: "踵膝試験", max: 4 },
];

const GUIDE_TEXT = {
  "1": `歩行（評価のポイント）：
評価は「壁に対して平行に歩く」「方向転換」「つぎ足歩行（つま先を踵に合わせて歩く）」の合算で行います。
0：問題なし。つぎ足歩行や方向転換が安定しており、10歩以上の歩行がほぼ問題なく行える（小さな踏み外し1回は許容）。
1：わずかな異常。つぎ足歩行は10歩以上可能だが、通常歩行に若干の乱れがある。
2：明らかな障害。つぎ足歩行が10歩を超えないが、短い距離は歩ける。
3：目立つふらつきがあり、方向転換が不安定だが、常時の支持までは要さない。
4：明瞭な不安定さ。時折壁や支えを利用する。
5：激しい不安定さ。単独歩行には杖や一部介助が必要。
6：適切な介助があれば長距離を歩けるが、歩行補助具や介助が必要。
7：充分な介助を行っても歩行距離が短い。歩行器などを常時要する。
8：介助があっても歩行は困難でほぼ歩行不能。`,

  "2": `立位（評価のポイント）：
立っているときの安定性や姿勢制御を観察します。
0：安定して立てる。
1：わずかに不安定だが短時間は維持できる。
2：明らかな支持の不安定性があり両下肢の安定が不十分。
3：支持基底面の拡大や軽い支持が必要になる。
4：自立が難しく、継続的な補助が必要。
5：常時明確な介助や歩行補助具が必要。
6：一人では立位保持が困難で、しっかりした介助がないと立てない。`,

  "3": `座位（評価のポイント）：
椅子に座っている際の姿勢および体幹の安定性を評価します。
0：安定して座れる。
1：わずかな体幹の不安定さがある。
2：座位での姿勢維持が難しく手で支える必要がある。
3：長時間の座位保持が困難で、頻繁に姿勢調整する。
4：座位を安定して保てず、支援が必要。`,

  "4": `言語機能（評価のポイント）：
発話の明瞭さ、流暢性、語の取り出しや発音の正確さを観察します。
0：明瞭で流暢に話せる。
1：わずかな不明瞭さがあるが日常会話は可能。
2：理解に努力が必要な場面が増える。
3：不明瞭さが顕著でコミュニケーションに支障が出る。
4：発話が著しく低下し、意思疎通が困難。`,

  "5": `指の追跡運動（評価のポイント）：
目標を注視しつつ指を追う動作の正確さと滑らかさを評価します。
0：滑らかで正確に実行できる。
1：小さなズレや遅れが見られる。
2：明らかな不正確さがあり修正が必要。
3：追跡が不安定で連続動作が難しい。
4：ほとんど実行できない。`,

  "6": `鼻指試験（評価のポイント）：
鼻と指を交互に触る際の精度と速度を評価します。
0：正確かつ安定して実行できる。
1：わずかなずれや速度低下がある。
2：目標への到達精度が低下する。
3：動作が粗雑で不正確になる。
4：ほとんど遂行できない。`,

  "7": `手の回内回外運動（評価のポイント）：
手の回内・回外の反復運動の滑らかさと協調性を評価します。
0：滑らかでリズムよく行える。
1：小さな遅延やぎこちなさがある。
2：リズムの乱れや不正確さが目立つ。
3：反復が途切れやすく連続動作が困難。
4：ほとんど行えない。`,

  "8": `踵膝試験（評価のポイント）：
踵を膝に滑らかに沿わせる動作の正確さと協調を評価します。
0：正確でスムーズに行える。
1：若干の不正確さや遅れがある。
2：動作が明らかに不正確で修正が必要。
3：協調性が低下し一貫性がない。
4：遂行不可または著しい困難。`,
};

const STORAGE_KEY = "sara_score_v1";

export default function App() {
  const allIds = FORM_ITEMS.map((it) => it.id);
  const initialScores = Object.fromEntries(allIds.map((id) => [id, 0]));
  const [scores, setScores] = useState(initialScores);
  const [notes, setNotes] = useState("");
  const total = useMemo(
    () => FORM_ITEMS.reduce((sum, it) => sum + Number(scores[it.id] ?? 0), 0),
    [scores]
  );

  const totalRowRef = useRef(null);
  const [totalRowOnScreen, setTotalRowOnScreen] = useState(true);
  useEffect(() => {
    const el = totalRowRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setTotalRowOnScreen(entry.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const setScore = (id, value) => {
    setScores((prev) => ({ ...prev, [id]: value }));
  };

  const resetAll = () => {
    if (!confirm("全スコアとメモをリセットします。よろしいですか？")) return;
    setScores(initialScores);
    setNotes("");
  };

  const handleExportCSV = () => {
    const headers = ["項目名", "スコア"];
    const rows = FORM_ITEMS.map((it) => [it.label, scores[it.id]]);
    rows.push(["合計", total]);
    rows.push(["メモ", notes.replace(/\r?\n/g, " ")]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sara_score_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [pop, setPop] = useState({ open: false, id: null, text: "", x: 0, y: 0, w: 0 });
  const handleLabelClick = (e, id) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setPop({
      open: true,
      id,
      text: GUIDE_TEXT[id] || "",
      x: rect.left + window.pageXOffset,
      y: rect.bottom + window.pageYOffset + 8,
      w: rect.width,
    });
  };
  const closePop = () => {
    setPop((p) => ({ ...p, open: false }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto p-6 pt-20">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">SARA スコア（簡易版）</h1>
        <p className="text-xs text-gray-500 mb-6 text-center">
          個人/教育目的のプロトタイプ
        </p>

        {/* 合計とメモ */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div ref={totalRowRef} className="rounded-2xl bg-white p-4 shadow">
            <div className="text-sm text-gray-500">合計</div>
            <div className="text-3xl font-bold">{total}</div>
          </div>
          <div className="sm:col-span-2 rounded-2xl bg-white p-4 shadow">
            <div className="text-sm text-gray-500 mb-1">メモ</div>
            <textarea
              className="w-full min-h-[80px] border rounded-xl px-3 py-2"
              placeholder="測定条件や所見メモなど"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* スコアテーブル */}
        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <table className="w-full text-sm table-auto">
            <thead className="bg-gray-100 hidden md:table-header-group">
              <tr>
                <th className="w-10 px-1 py-2 text-left text-xs text-gray-500">#</th>
                <th className="px-2 py-2 text-left">項目</th>
                <th className="px-2 py-2 text-left">スコア</th>
              </tr>
            </thead>
            <tbody>
              {FORM_ITEMS.map((it, idx) => (
                <tr key={it.id} className="border-t">
                  <td className="px-1 py-2 font-mono text-xs text-gray-400 text-center align-top">
                    {idx + 1}
                  </td>
                  <td className="p-3 align-top flex items-center gap-2">
                    <div className="text-gray-900 text-base">{it.label}</div>
                    <button
                      type="button"
                      onClick={(e) => handleLabelClick(e, it.id)}
                      className="text-xs text-blue-500 hover:underline px-2 py-1 border border-blue-500 rounded"
                    >
                      説明
                    </button>
                  </td>
                  <td className="p-3 align-top">
                    {(it.id === "1" || it.id === "2" || it.id === "4") ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="grid grid-cols-5 gap-2 justify-end mb-2">
                          {Array.from({ length: 5 }, (_, n) => (
                            <button
                              key={n}
                              onClick={() => setScore(it.id, n)}
                              className={`py-2 rounded-lg border text-sm w-12 md:w-14 lg:w-16 ${
                                Number(scores[it.id]) === n
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        {it.id === "1" ? (
                          <div className="grid grid-cols-4 gap-2 justify-end">
                            {Array.from({ length: 4 }, (_, i) => {
                              const n = i + 5;
                              return (
                                <button
                                  key={n}
                                  onClick={() => setScore(it.id, n)}
                                  className={`py-2 rounded-lg border text-sm w-12 md:w-14 lg:w-16 ${
                                    Number(scores[it.id]) === n
                                      ? "bg-blue-500 text-white border-blue-500"
                                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 justify-end">
                            {Array.from({ length: 2 }, (_, i) => {
                              const n = i + 5;
                              return (
                                <button
                                  key={n}
                                  onClick={() => setScore(it.id, n)}
                                  className={`py-2 rounded-lg border text-sm w-12 md:w-14 lg:w-16 ${
                                    Number(scores[it.id]) === n
                                      ? "bg-blue-500 text-white border-blue-500"
                                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2 sm:flex sm:justify-end sm:gap-2">
                        {Array.from({ length: it.max + 1 }, (_, n) => (
                          <button
                            key={n}
                            onClick={() => setScore(it.id, n)}
                            className={`py-2 rounded-lg border text-sm w-full sm:w-12 md:w-14 lg:w-16 ${
                              Number(scores[it.id]) === n
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ボタン群 */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-white border hover:bg-gray-50 text-sm"
            onClick={handleExportCSV}
          >
            CSVエクスポート
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-white border hover:bg-gray-50 text-sm"
            onClick={resetAll}
          >
            リセット
          </button>
        </div>
      </div>

      {/* 合計カード固定表示 */}
      {!totalRowOnScreen && (
        <div className="fixed top-6 left-6 z-40">
          <div className="rounded-2xl bg-white p-5 shadow border">
            <div className="text-sm text-gray-500">合計</div>
            <div className="text-3xl font-bold">{total}</div>
          </div>
        </div>
      )}

      {/* ポップオーバー */}
      {pop.open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-start justify-center pt-20 px-4"
          onClick={closePop}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl p-4 max-w-2xl w-full shadow-lg relative"
            style={{
              left: "50%",
              top: pop.y,
              transform: "translateX(-50%)",
              width: "min(90vw, 700px)",
              maxHeight: "80vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePop}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="text-gray-900 text-sm whitespace-pre-wrap">{pop.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}