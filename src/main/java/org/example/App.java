package org.example;

import java.util.Arrays;

public class App {
    public static void main(String[] args) {
        System.out.println("Hello World!");

        int[] arr = {4,3,2,1};
        System.out.println(Arrays.toString(arr));
        for (int i = 0; i < arr.length - 1; i++) {
            boolean haveSwipe = false;
            for (int j = 0; j < arr.length - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1] = temp;
                    haveSwipe = true;
                }
            }
            if (!haveSwipe) break;
        }
        System.out.println(Arrays.toString(arr));
    }
}
