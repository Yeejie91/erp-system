/**
 * 格式化货币为会计格式
 * @param amount 金额
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的货币字符串，例如：RM5,000.00
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  const formatted = amount.toLocaleString('en-MY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `RM${formatted}`;
}

/**
 * 格式化数字（带千分位，但不带货币符号）
 * @param num 数字
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的数字字符串，例如：5,000.00
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-MY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

