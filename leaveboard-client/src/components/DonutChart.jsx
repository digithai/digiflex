import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { History, ArrowRight } from 'lucide-react';
import styles from '../styles/MainPage.module.css';

const DonutChart = ({ total, remaining, label, onViewHistory }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Convert to numbers and limit remaining so it never exceeds total
  const totalNum = Number.isFinite(Number(total)) ? Number(total) : 0;
  const remainingNum = Math.max(0, Math.min(totalNum, Number.isFinite(Number(remaining)) ? Number(remaining) : 0));
  const used = totalNum - remainingNum;

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartRef.current) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }

      // Create new chart
      const blueColor = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#3b82f6';
      const ctx = chartRef.current.getContext('2d');
      const hasQuota = totalNum > 0;
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: hasQuota ? ['Remaining', 'Used'] : ['No quota'],
          datasets: [{
            data: hasQuota ? [remainingNum, used] : [1],
            backgroundColor: hasQuota
              ? [blueColor, '#e2e8f0']
              : ['#e2e8f0'],
            borderWidth: 0,
            cutout: '70%' // This creates the donut hole
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: false
            }
          },
          animation: {
            animateRotate: true,
            animateScale: false
          }
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [totalNum, remainingNum, used]);

  return (
    <div className={styles.donutWrapper}>
      <div className={styles.donutHeader}>
        <span className={styles.donutTitle}>{label}</span>
        <span className={styles.donutTotalBadge}>{totalNum} days total</span>
      </div>
      <div className={styles.donutChartContainer}>
        <canvas ref={chartRef} />
        <div className={styles.donutCenterText}>
          <div className={styles.donutValue}>{remainingNum}</div>
          <div className={styles.donutUnit}>
            {remainingNum <= 1 ? 'day' : 'days'} left
          </div>
        </div>
      </div>
      <div className={styles.donutFooter}>
        <span className={styles.donutMeta}>{Math.min(used, totalNum)} / {totalNum} used</span>
        {onViewHistory && (
          <button
            type="button"
            className={styles.donutViewButton}
            onClick={onViewHistory}
          >
            <History className={styles.donutViewIcon} />
            <span>View logs</span>
            <ArrowRight className={styles.donutViewIcon} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DonutChart;