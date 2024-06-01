export const clamp = (value: number, min: number, max: number) => {
    return Math.max(Math.min(value, max), min);
}

export const dot_product = (a: number[], b: number[]) => {
    let sum = 0;
    a.forEach((n, i) => sum += n * b[i]);
    return sum;
}

export const magnitude = (a: number[]) => {
    let sum = 0;
    a.forEach(n => sum += n * n);
    return Math.sqrt(sum);
}

export const cosine_similarity = (a: number[], b: number[]) => {
    return dot_product(a, b) / (magnitude(a) * magnitude(b));
}