---
title: Bash의 $((..))와 ((..))에 대하여
date: "2018-01-18T02:04:00.000Z"
template: "post"
draft: false
slug: "about-bash-arithmetic-commands"
category: "Bash"
tags:
    - "Bash"
description: "About bash arithmetic commands"
---

이 포스트는 GNU bash, version 3.2.57(1)-release 환경에서 작성되었습니다.

Bash에는 arithmetic expression을 다루기 위해 여러가지 builtin을 제공하는데, 이 중 생김새가 비슷해 혼동되는 $((..))와 ((..))에 대해 다뤄보려고 합니다.

## $((..))와 ((..)), 왜 헷갈릴까?

C나 Java 같은 프로그래밍 언어에 익숙한 저는 산술 연산에 $((..)), ((..)) 같은 기호가 친근하지 않았습니다.
게다가 생긴것도 비슷하게 생겼고, 수식 연산을 평가한다는 같은 역할을 하고 있죠. 하지만 방법이나 결과 등에서 미묘하게 차이점이 있는 것 같았습니다.

그래서 $((..))와 ((..))의 공통점과 차이점을 살펴보면서 애매함을 해결해보겠습니다.

## $((..))와 ((..))의 공통점

### C언어 스타일의 arithmetic expression

우선 두 가지 기능이 가지는 공통점은 괄호 인에 C언어 스타일의 산술 표현식(arithmetic expression)이 온다는 점입니다. 아래와 같이 말이죠.

```Bash
a=$(( 2 + 3 ))
if (( 3 > 2 )); then echo "Hello World"; fi
```

즉, Bash에서 산술 연산[^1] 을 하고 싶은 경우에 $((..))와 ((..))를 사용합니다.

## $((..))와 ((..))의 차이점

### 1. Arithmetic expansion과 Arithmetic evaluation command

$((..))와 ((..)) 안에 있는 산술 표현식은 평가되는 시점이 다릅니다.
이를 이해하기 위해서는 shell이 입력을 받아 실행시키기까지의 일련의 과정과 shell expansion에 대해 짚고 넘어갈 필요가 있습니다.

#### Shell이 입력을 받아 실행시키는 과정과 Shell expansion

shell은 터미널로부터 입력을 받으면, 그 입력을 적당한 토큰으로 나눈 후 각 토큰에 대해 shell expansion을 진행합니다.
shell은 expand되어야 할 토큰들을 적절하게 변환한 후 command를 실행합니다.

여기서 shell expansion은 특정한 character(~, $, { 등)을 문자 그대로의 의미가 아닌 특수한 의미로 해석하는 작업이라고 할 수 있습니다.
(shell expansion 작업은 보통 본래의 표현을 더 긴 표현으로 바꾸기 때문에 '확장(expansion)'이라는 이름이 붙지 않았나 추측합니다.)

예를 한번 들어보겠습니다.
"Hello,item4\~\~"와 "Hello,mrmeta\~\~"를 echo를 이용해 터미널에 연달아 출력하려고 합니다.
이는 간단하게 아래와 같이 할 수 있습니다.

```Bash
#[ case 1 ]
echo Hello,item4~~ Hello,mrmeta~~
```

하지만 위 표현을 shell expansion을 이용해 간략하게 줄일 수 있습니다.

```Bash
#[ case 2 ]
echo Hello,{item4,mrmeta}~~
```

[case 2]에서는 직접 "Hello,item4\~\~"와 "Hello,mrmeta\~\~"을 타이핑하는 대신 shell expansion 중 하나인 brace expansion을 사용했습니다.

[case 2]에서 shell은 입력을 받은 후 brace expansion을 진행합니다.
brace expansion은 공통된 접두사와 접미사를 가지는 여러 개의 문자열을 만드는데 사용됩니다.
"{" 앞의 문자열 "Hello,"와 "}" 뒤의 문자열 "\~\~"이 공유되며 { } 안에 있는 문자열들 "item4", "mrmeta"가 내용이 되는 문자열들이 각각 만들어 집니다.
따라서 [case 2]는 [case 1]과 같은 결과가 나옵니다.

arithmetic expansion( __$((..))__ )도 shell expansion의 한 종류입니다.
shell은 커맨드가 실행되기 전에 $((..))를 괄호 안의 수식 연산을 평가한 결과로 대체(substitution)합니다.

반면, arithmetic evaluation command( __((..))__ )은 커맨드입니다.
괄호 안의 수식 연산을 평가한 후 그에 맞게 exit code를 뿌려주고 종료됩니다.

이 둘의 차이를 예제를 통해 알아보겠습니다.
여기서 if는 뒤에 오는 커맨드를 실행한 후 그 exit code를 가지고 진행할 분기를 결정하는 shell command입니다.

```Bash
#[ case 3 ]
if $(( 1 == 1 )); then echo "1 == 1"; fi

#[ case 4 ]
if (( 1 == 1 )); then echo "1 == 1"; fi
```

위 예제를 실행시켜보면 [case 3]에서 1: command not found 에러가 발생하는 것을 볼 수 있습니다.
이는 커맨드가 실행되기 전에 $(( 1 == 1 ))이 이미 1로 변환되었음을 뜻합니다.
그래서 1이라는 커맨드는 존재하지 않으므로 not found 에러가 발생한거죠.

반면, [case 4]에서는 1 == 1이 의도한 대로 잘 출력됩니다.
1 == 1은 참이므로 커맨드 (( 1 == 1 ))는 exit code로 0을 뿌려줍니다.
그래서 if문이 잘 직동하는 것이죠.

### 2. 결과를 보여주는 방식의 차이

$((..))는 그 자체를 수식 연산의 평가 결과 그 자체로 대체됩니다.
하지만 ((..))는 수식 연산의 평가 결과가 0이 아닌 경우 exit code로 0을, 0인 경우 exit code로 1을 리턴하고 종료되는 커맨드입니다.
(exit code는 출력과 다릅니다. 예를 들어 ls은 현재 디렉토리에 포함된 것들을 __출력__하지만 그와는 별개로 커맨드가 종료될 때 숫자로 된 exit code를 __반환__합니다.)

자, 예제를 통해 자세히 알아보겠습니다.

```Bash
echo $(( 2 + 5 )) # echo 7과 같습니다.
```

$(( 2 + 5 ))는 2+5의 결과 7로 변환되어 결국 echo 7을 실행하는 것과 같습니다.

```Bash
$(( 2 + 5 ))
```

$(( 2 + 5 ))는 7로 변환되고 7이라는 커맨드를 찾을 수 없어 7: command not found 에러가 발생합니다.

```Bash
echo `(( 2 + 5 ))`
```

(( 2 + 5 ))에서 2 + 5는 7로 0이 아니므로 exit code를 0로 하고 종료됩니다. 출력하는 내용은 없으므로 echo에 의해 찍히는 것은 없습니다.

```Bash
(( 2 + 5 ))
echo $?
```

(( 2 + 5 ))는 그 자체 커맨드이므로 문제없이 잘 실행됩니다.
$?은 특수한 파라미터로 바로 전에 실행된 커맨드의 exit code를 의미하는 파라미터입니다. 따라서 0이 출력됩니다.

## 그럼 $((..))와 ((..))는 각각 언제 사용해야 하는가?

산술 연산의 결과 자체를 사용하고자 할 때는 $((..))를 사용하고,
(예를 들어 커맨드에 넘겨줄 argument로 산술 연산의 결과를 변수에 저장하지 않고 바로 넘기고 싶을 때)

```Bash
var=5
touch $(( $var + 2 )) # 7이라는 빈 파일이 생성됩니다.
```

__if에서 산술 비교 연산을 조건으로 사용하고 싶을 때__ ((..))를 사용하면 됩니다.

```Bash
var1=1
var2=2
if (( $var1 > $var2 )); then
    echo "$var1 > $var2"
else
    echo "$var1 <= $var2" # 1 <= 2가 출력됩니다.
fi
```

변수에 산술 연산의 결과를 저장할 때는 $((..))와 ((..)) 둘 다 사용할 수 있습니다.

```Bash
var3=$(( 2 + 5 ))
(( var4 = 2 + 5 ))
```

## 정리

1. $((..))은 수식 연산의 결과로 변환되는 shell expansion입니다. 커맨드가 위치해야 할 자리에 오면 안 됩니다.
2. ((..))은 수식 연산의 결과에 따라 exit code를 정해 반환하는 command입니다. 값이 위치해야 할 자리에 오면 안 됩니다.
3. if에서 산술 비교 연산을 조건으로 쓰고 싶을 때는 ((..))를 사용하세요.
4. 커맨드의 argument로 직접 수식 연산의 결과를 전달하고 싶을 때는 $((..))를 사용하세요.
5. 변수에 값을 할당할 때는 $((..))와 ((..)) 둘 다 사용할 수 있습니다.

[^1]: 물론 다른 방법으로도 산술 연산을 할 수 있지만 본문의 주제와 거리가 있기 때문에 다루지 않겠습니다. 참고로 ((..))와 let은 거의 비슷합니다.
