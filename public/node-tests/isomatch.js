"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_isomatch = void 0;
const fs = __importStar(require("fs"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const canvas_1 = require("@napi-rs/canvas");
const get_pixels_1 = __importDefault(require("get-pixels"));
// @ts-ignore
const druid = __importStar(require("@saehrimnir/druidjs"));
// const druid = require('@saehrimnir/druidjs');
const munkres = require('munkres-js');
const grid = [15, 15];
const num_images = grid[0] * grid[1];
const canvas_size = [1024, 1024];
const square_size = [canvas_size[0] / grid[0], canvas_size[1] / grid[1]];
const canvas = (0, canvas_1.createCanvas)(canvas_size[0], canvas_size[1]);
const ctx = canvas.getContext('2d');
const base_path = `./public`;
const get_pixels = (path) => new Promise((res) => {
    (0, get_pixels_1.default)(path, (err, pixels) => {
        if (err) {
            console.log("Bad image path");
            return;
        }
        res(pixels);
    });
});
const main = async () => {
    // select images from dataset for isomatching
    const folder_paths = fs.readdirSync(`${base_path}/flowers`);
    const image_paths = folder_paths.map(folder => {
        const file_names = fs.readdirSync(`${base_path}/flowers/${folder}`);
        return file_names.map(file_name => `${base_path}/flowers/${folder}/${file_name}`);
    }).flat();
    const chosen_images = [];
    for (let i = 0; i < num_images; i++) {
        const index = image_paths.length * Math.random() | 0;
        chosen_images.push(image_paths[index]);
        image_paths.splice(index, 1);
    }
    // extract features from each image
    const pixels = [];
    const images = [];
    const avg_colors = []; // currently feature is R, G
    for (let i = 0; i < num_images; i++) {
        const path = chosen_images[i];
        const image_pixels = await get_pixels(path);
        const data = new Uint8ClampedArray(image_pixels.data.buffer);
        pixels.push(data);
        const sum_color = [0, 0, 0];
        for (let j = 0; j < data.length; j += 4) {
            sum_color[0] += data[j];
            sum_color[1] += data[j + 1];
            sum_color[2] += data[j + 2];
        }
        const avg_color = sum_color.map(n => n / (data.length / 4) | 0);
        avg_colors.push(avg_color);
        const image = await (0, canvas_1.loadImage)(path);
        images.push(image);
    }
    console.log('Number of images processing: ', avg_colors.length);
    // perform isomap dimensionality reduction
    let features = avg_colors.slice(0);
    const X = druid.Matrix.from(features);
    const DR = new druid.ISOMAP(X, { d: 2 });
    const DR_X = DR.transform().to2dArray;
    features = DR_X.map(feature => Array.from(feature));
    // build cost matrix
    const cost_matrix = [];
    const positions = [];
    for (let i = 0; i < features.length; i++) {
        let feature = features[i];
        let row = []; // each row = different feature, each column = different position
        for (let j = 0; j < features.length; j++) {
            let position = [j / grid[0] | 0, j % grid[0]];
            positions.push(position);
            let distance = Math.sqrt(// distance from i color to j position on the grid
            (feature[0] - position[0]) ** 2 +
                (feature[1] - position[1]) ** 2);
            row.push(distance);
        }
        cost_matrix.push(row);
    }
    const pairings = munkres(cost_matrix);
    console.log(pairings);
    // draw final isomatched grid
    for (let pair of pairings) {
        let row_index = pair[0];
        let column_index = pair[1];
        let color = avg_colors[row_index];
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${255})`;
        let [x, y] = positions[column_index];
        const x_corner = x * square_size[0];
        const y_corner = y * square_size[1];
        ctx.drawImage(images[row_index], x_corner, y_corner, square_size[0], square_size[1]);
    }
    const pngData = await canvas.encode('png');
    await node_fs_1.promises.writeFile((0, node_path_1.join)(__dirname, 'simple.png'), pngData);
};
main();
const run_isomatch = () => main();
exports.run_isomatch = run_isomatch;
