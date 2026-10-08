"use client"; // 클라이언트 컴포넌트

import type { StatHistoryLine } from "@chatbot/features/chat/event-model"; // 그래프 자료
import { formatStatValue } from "@chatbot/features/chat/stat-model"; // 값 표시
import styles from "@chatbot/features/chat/ChatPanels.module.css"; // 채팅 보조 영역 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

const WIDTH = 168; // 그래프 너비
const HEIGHT = 44; // 그래프 높이
const PAD = 7; // 안쪽 여백(끝 점이 잘리지 않게)

function lineLabel(line: StatHistoryLine): string // 줄 이름(인물 + 스탯)
{ // 함수 시작
    return line.target === null ? t(line.name) : `${line.target} ${t(line.name)}`; // 이름 반환(기본 스탯 이름은 화면 언어로)
} // 함수 종료

function Sparkline({ line }: { line: StatHistoryLine }) // 스탯 하나의 턴별 변화(한 줄 = 한 색, 세로축은 그 스탯의 최솟값~최댓값)
{ // 함수 시작
    const span = Math.max(1, line.max - line.min); // 값 범위
    const x = (index: number) => line.points.length === 1 ? WIDTH / 2 : PAD + (index * (WIDTH - PAD * 2)) / (line.points.length - 1); // 가로 위치
    const y = (value: number) => HEIGHT - PAD - ((Math.min(line.max, Math.max(line.min, value)) - line.min) / span) * (HEIGHT - PAD * 2); // 세로 위치
    const path = line.points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" "); // 꺾은선
    const last = line.points.at(-1); // 마지막 점
    return ( // 그래프 반환
        <svg className={styles.trendChart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t("{0} 변화: {1}", [lineLabel(line), line.points.map((point) => t("{0}턴 {1}", [point.turn, point.value])).join(", ")])}> {/* 꺾은선 그래프 */}
            <line className={styles.trendGrid} x1={0} x2={WIDTH} y1={y(line.max)} y2={y(line.max)} /> {/* 최댓값 선 */}
            <line className={styles.trendGrid} x1={0} x2={WIDTH} y1={y(line.min)} y2={y(line.min)} /> {/* 최솟값 선 */}
            {line.points.length > 1 ? <path className={styles.trendLine} d={path} /> : null} {/* 변화 선 */}
            {last === undefined ? null : <circle className={styles.trendDot} cx={x(line.points.length - 1)} cy={y(last.value)} r={4} />} {/* 지금 값 */}
            {line.points.map((point, index) => <circle key={point.turn} className={styles.trendHit} cx={x(index)} cy={y(point.value)} r={9}><title>{t("{0}턴 · {1}", [point.turn, point.value])}</title></circle>)} {/* 점마다 값 보기 */}
        </svg> // 그래프 종료
    ); // 반환 종료
} // 함수 종료

export function StatTrend({ lines }: { lines: StatHistoryLine[] }) // 턴별 스탯 변화(스탯마다 작은 그래프 + 표로 보기)
{ // 함수 시작
    const turns = [...new Set(lines.flatMap((line) => line.points.map((point) => point.turn)))].sort((left, right) => left - right); // 표의 턴
    return ( // 영역 반환
        <div className={styles.trend} role="group" aria-label={t("턴별 스탯 변화")}> {/* 그래프 영역 */}
            <ul className={styles.trendList}> {/* 스탯별 줄 */}
                {lines.map((line) => // 줄 순회
                { // 순회 시작
                    const last = line.points.at(-1); // 지금 값
                    const first = line.points[0]; // 처음 값
                    return ( // 줄 반환
                        <li key={line.key}> {/* 스탯 줄 */}
                            <span className={styles.trendName}>{line.icon.length === 0 ? null : <span aria-hidden="true">{line.icon} </span>}{lineLabel(line)}</span> {/* 이름 */}
                            <Sparkline line={line} /> {/* 그래프 */}
                            <span className={styles.trendValue}><b>{last === undefined ? "-" : formatStatValue({ value: last.value, min: line.min, max: line.max })}</b>{first === undefined || last === undefined || line.points.length < 2 ? null : <small>{first.turn}{t("턴")} {first.value} → {last.turn}{t("턴")} {last.value}</small>}</span> {/* 지금 값과 처음 값 */}
                        </li> // 줄 종료
                    ); // 반환 종료
                })} {/* 순회 종료 */}
            </ul> {/* 줄 종료 */}
            <details className={styles.trendTable}> {/* 표로 보기 */}
                <summary>{t("표로 보기")}</summary> {/* 펼침 */}
                {/* 표 안 공백 텍스트는 하이드레이션 오류를 만들어 줄 끝 주석을 두지 않음 */}
                <div><table><thead><tr><th scope="col">{t("턴")}</th>{lines.map((line) => <th key={line.key} scope="col">{lineLabel(line)}</th>)}</tr></thead><tbody>{turns.map((turn) => <tr key={turn}><th scope="row">{turn}{t("턴")}</th>{lines.map((line) => <td key={line.key}>{line.points.find((point) => point.turn === turn)?.value ?? "-"}</td>)}</tr>)}</tbody></table></div>
            </details> {/* 표 종료 */}
        </div> // 영역 종료
    ); // 반환 종료
} // 함수 종료
