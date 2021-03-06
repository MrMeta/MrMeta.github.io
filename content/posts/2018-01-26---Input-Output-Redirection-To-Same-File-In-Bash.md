---
title: Bash에서 입출력을 한 파일로 동시에 Redirection 하기
date: "2018-01-26T23:07:00.000Z"
template: "post"
draft: false
slug: "input-output-redirection-to-same-file-in-bash"
category: "Bash"
tags:
    - "Bash"
    - "C"
description: "Input output redirection to same file in bash"
---

이 포스트는 GNU bash, version 3.2.57(1)-release 환경에서 작성되었습니다.

Bash에서 standard I/O은 파일로 redirection될 수 있습니다. 아래와 같이 말이죠.

```Bash
cat infile
# The sed utility reads the specified files, or the standard input if no files are specified, modifying the input as specified by a list of commands.

# the를 The로 바꾸는 커맨드
sed 's/the/The/g' < infile > outfile
```

워 스크립트에서는 stdin을 infile에 연결하여 sed에 대한 입력으로 사용하고, stdout을 outfile에 연결하여 sed의 출력이 outfile에 저장됩니다.

저는 여기서 '결과를 infile 자체에 저장하고 싶은데 과연 입출력을 한 파일로 동시에 redirection 할 수 있을까?' 라는 의문이 들었습니다.
이 포스트는 이 질문에서 시작합니다.

## 단순하게 시도하기

처음으로 시도한 방법은 가장 직관적인 방법이었습니다.

```Bash
sed 's/the/The/g' < infile > infile
cat infile          # 아무 것도 출력되지 않습니다.
```

하지만 예상한 바와는 다르게 infile에는 아무 것도 출력되지 않은 것을 알 수 있습니다.

## 왜 안 될까?

이를 설명하기 위해서는 Bash에 대해 조금은 깊숙히 다룰 필요가 있습니다.

Bash는 C로 작성된 프로그램입니다.[^1] 이는 redirection 처리가 내부적으로 C에 의해 이루어진다는 의미입니다.
위 sed 커맨드는 내부적으로 대략 이렇게 처리된다고 할 수 있습니다.

```C
// infile을 "w"모드로 open 합니다.
int fd1 = open("infile", O_TRUNC|O_WRONLY|O_CREAT);
// infile을 "r"모드로 open 합니다.
int fd2 = open("infile", O_RDONLY);

// 파일 디스크립터 0을 표준 입력에서 fd1로 변경합니다.
dup2(fd1, 0);
// 파일 디스크립터 1을 표준 출력에서 fd2로 변경합니다.
dup2(fd2, 1);

// sed 실행
// sed 내에서의 입출력은 각각 파일 디스크립터 0, 1로 이뤄지므로
// 결국 아래 코드는 infile로부터 입력을 받아 infile로 출력하게 됩니다.
sed(args);
```

그래서 왜 안 되는 걸까요? 위 코드를 우리가 실행해 볼 수 있는 수준으로 단순화해보겠습니다.

우선 testfile이라는 파일을 만들고 텍스트를 넣습니다.

```Bash
echo 'Hello World' > testfile
```

그 후 같은 디렉터리에서 아래 C 코드를 작성, 컴파일한 후 실행해 봅시다.

```C
#include <stdio.h>

int main(){
    // fopen()은 내부적으로 open()을 호출합니다.
    FILE* in = fopen("testfile", "r");
    FILE* out = fopen("testfile", "w");
    char buf[100];

    // 위 코드에서 파일 디스크립터 0, 1을 변경하는 부분을 제거하고
    // 직접 파일을 열어 읽고 쓰는 식으로 바꿨습니다.
    // testfile로부터 "Hello World"라는 문자열을 읽어 buf에 저장합니다.
    fgets(buf, 100, in);
    // "Hello World"를 testfile에 씁니다.
    fputs(buf, out);

    fclose(in);
    fclose(out);

    return 0;
}
```

위 코드를 실행해 보면 infile이 비어있던 것처럼 testfile도 비어있음을 확인할 수 있습니다.
__즉, 위 sed 커맨드가 생각대로 작동되지 않은 이유는 C의 open() 함수의 작동 방식 때문이었다는 것을 알 수 있습니다.__

자, open()은 system call이므로 이제 문제가 OS로 확장되었습니다.
이번 포스트에서는 OS까지 다룰 생각이 전혀 없으므로
__'open() system call을 이용해 한 파일을 "r"모드와 "w"모드로 동시에 열면 문제가 생기는구나'__
정도로 이해하고 넘어가려고 합니다.

## 다른 방법으로 시도하기

제가 원하는 결과를 얻기 위해선 어떻게 해야 할까요?

구글링 해본 결과 bash의 그룹 커맨드 { }와 rm을 이용하면 standard I/O을 하나의 파일로 동시에 redirection할 수 있다는 사실을 발견했습니다.
아래와 같이 말이죠.

```Bash
{ rm -f infile; sed 's/the/The/g' > infile ;} < infile
cat infile
```

위 커맨드는 제가 원하던 결과를 출력합니다. 하지만 rm 커맨드를 사용하는 부분이 조금 찝찝합니다.
위 커맨드를 실행하기 전과 후의 infile가 서로 같은 파일이라면 rm 커맨드는 실행되지 않은 걸까요?
정말 입력에 사용한 infile과 출력에 사용한 infile이 같은 파일인지 한 번 확인해보겠습니다.

```Bash
# infile의 inode 값을 출력합니다.
# 여기서 inode 값은 파일에 대한 식별자라고 할 수 있습니다.
stat -f %i infile
{ rm -f infile; sed 's/the/The/g' > infile ;} < infile
stat -f %i infile
```

위 커맨드를 실행해보면 2번째 커맨드를 실행하기 전후 infile의 inode[^2] 값이 변경되었음을 확인할 수 있습니다.
__즉, 이는 입력은 기존의 infile을 사용했지만, 출력은 이름만 infile인 다른 파일을 사용했다는 것을 의미합니다.__

여기서 눈여겨 볼 점은 그룹 커맨드 안에서 infile이 이미 삭제되었음에도 불구하고 sed에 대한 입력은 여전히 삭제된 infile로 연결되어 있다는 점입니다.

## 왜 될까?

위 커맨드가 어떤 순서로 진행되는 지 천천히 살펴보겠습니다.

 1. 그룹 커맨드를 실행하기 전에 input redirection을 먼저 처리합니다. 그룹 커맨드의 입력은 infile로 redirection됩니다.
 2. rm -f infile이 실행되어 infile이 삭제됩니다.
 3. infile이 삭제되었음에도 불구하고 sed 커맨드의 입력은 그룹 커맨드 밖에서 redirection했던 infile에서 읽어옵니다.
 4. sed 커맨드가 실행됩니다.
 5. sed 커맨드의 출력은 infile로 redirection됩니다. 이 때, infile이라는 파일이 없으므로 새로 생성됩니다.

3번이 별로 직관적이지 않아 보입니다. C에서는 어떻게 동작할 지 실습을 한 번 해보곘습니다.

이전과 같이 먼저 testfile을 만들고,

```Bash
echo 'Hello World' > testfile
```

아래의 C코드를 작성, 컴파일한 후 실행해 봅시다.

```C
#include <stdio.h>

int main(){
    // fopen()은 내부적으로 open()을 호출합니다.
    FILE* in = fopen("testfile", "r");
    FILE* out;
    char buf[100];

    // testfile을 삭제합니다.
    remove("testfile");

    out = fopen("testfile", "w");

    // testfile로부터 "Hello World"라는 문자열을 읽어 buf에 저장합니다.
    fgets(buf, 100, in);
    // "Hello World"를 testfile에 씁니다.
    fputs(buf, out);

    fclose(in);
    fclose(out);

    return 0;
}
```

실행해 보면 testfile에 "Hello World"가 저장되어 있음을 확인할 수 있습니다. 역시 이 정도의 결론을 내릴 수 있습니다.

__'아, open() system call로 파일을 "r"모드로 열었다면 그 파일을 삭제해도 입력을 처리할 수 있구나'__

## 사실...

사실 infile 내에서 the를 The로 바꾸는 작업을 sed의 옵션을 사용해서 처리할 수 있습니다. 또한 이렇게 처리하는 것이 더 안전합니다.

```Bash
# -i 옵션은 백업 파일을 위한 확장자를 받습니다.
sed -i.bak 's/the/The/g' infile
```

참 멀리 돌아온 것 같은 기분이 드는 건 기분 탓입니다.(...)

[^1]: GNU Bash source code:  https://ftp.gnu.org/gnu/bash/
[^2]: https://ko.wikipedia.org/wiki/%EC%95%84%EC%9D%B4%EB%85%B8%EB%93%9C